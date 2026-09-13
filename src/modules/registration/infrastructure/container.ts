import { prisma } from "@/lib/prisma";
import type { PrismaTransactionClient } from "@/lib/prisma";
import { PrismaBatchLookup } from "@/lib/batch-lookup";
import { PrismaAuditRecorder } from "@/lib/audit";
import { buildAdminResetPasswordUseCase, getIssueEmailVerificationTokenUseCase } from "@/modules/auth";
import { buildCreateStudentUseCase } from "@/modules/students";
import { sendDirectEmail, notificationService } from "@/modules/notifications";
import type { NotificationRequest, NotificationService } from "@/modules/notifications";
import { SubmitRegistrationRequestUseCase } from "../application/use-cases/submit-registration-request";
import { ListRegisterableBatchesUseCase } from "../application/use-cases/list-registerable-batches";
import { SearchRegistrationRequestsUseCase } from "../application/use-cases/search-registration-requests";
import { GetRegistrationRequestUseCase } from "../application/use-cases/get-registration-request";
import { MarkRegistrationRequestUseCase } from "../application/use-cases/mark-registration-request";
import { ResendRegistrationVerificationUseCase } from "../application/use-cases/resend-registration-verification";
import {
  DecideRegistrationRequestUseCase,
  type ApproveRegistrationTransactionContext,
} from "../application/use-cases/decide-registration-request";
import { PrismaRegistrationRequestRepository } from "./prisma-registration-request-repository";
import { PrismaExistingAccountLookup } from "./prisma-existing-account-lookup";
import { PrismaRegisterableBatchLookup } from "./prisma-registerable-batch-lookup";
import { PrismaRegistrationReviewerLookup } from "./prisma-registration-reviewer-lookup";

// No secrets required — safe to construct eagerly.
const registrationRequestRepository = new PrismaRegistrationRequestRepository(prisma);
const batchLookup = new PrismaBatchLookup(prisma);
const existingAccountLookup = new PrismaExistingAccountLookup(prisma);
const registerableBatchLookup = new PrismaRegisterableBatchLookup(prisma);
const reviewerLookup = new PrismaRegistrationReviewerLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const submitRegistrationRequestUseCase = new SubmitRegistrationRequestUseCase({
  registrationRequestRepository,
  batchLookup,
  existingAccountLookup,
  reviewerLookup,
  notificationService,
  issueEmailVerificationToken: (input) => getIssueEmailVerificationTokenUseCase().execute(input),
});

/** MYARCH Phase 1 — called only from /api/auth/verify-email/route.ts, never from within the auth module (see that route's own doc comment for why). */
export async function markRegistrationRequestEmailVerified(registrationRequestId: string): Promise<void> {
  await registrationRequestRepository.markEmailVerified(registrationRequestId);
}

export const listRegisterableBatchesUseCase = new ListRegisterableBatchesUseCase({
  registerableBatchLookup,
});
export const searchRegistrationRequestsUseCase = new SearchRegistrationRequestsUseCase({
  registrationRequestRepository,
});
export const getRegistrationRequestUseCase = new GetRegistrationRequestUseCase({
  registrationRequestRepository,
});
export const markRegistrationRequestUseCase = new MarkRegistrationRequestUseCase({
  registrationRequestRepository,
  auditRecorder,
  reviewerLookup,
  notificationService,
});
export const resendRegistrationVerificationUseCase = new ResendRegistrationVerificationUseCase({
  registrationRequestRepository,
  issueEmailVerificationToken: (input) => getIssueEmailVerificationTokenUseCase().execute(input),
  auditRecorder,
});

/**
 * Runs the APPROVE path's create-student + reset-password + decide writes
 * (plus the approval audit entry) as one atomic Prisma transaction — see
 * DecideRegistrationRequestUseCaseDeps.runApproveTransaction's own doc
 * comment for why. Any notification a step raises mid-transaction (in
 * practice, resetPassword's ACCOUNT_CREDENTIALS_ISSUED) is captured by a
 * throwaway NotificationService rather than sent immediately, and handed
 * back to the use case to replay once this function returns — i.e. only
 * after Postgres has actually committed everything above.
 */
async function runApproveTransaction<T>(
  fn: (ctx: ApproveRegistrationTransactionContext) => Promise<T>,
): Promise<{ result: T; deferredNotifications: NotificationRequest[] }> {
  return prisma.$transaction(async (tx) => {
    const deferredNotifications: NotificationRequest[] = [];
    const deferredNotifier: NotificationService = {
      notify: async (request) => {
        deferredNotifications.push(request);
      },
    };

    const result = await fn({
      createStudent: (input) => buildCreateStudentUseCase(tx).execute(input),
      resetPassword: (input) => buildAdminResetPasswordUseCase(tx, deferredNotifier).execute(input),
      registrationRequestRepository: new PrismaRegistrationRequestRepository(tx),
      auditRecorder: new PrismaAuditRecorder(tx),
    });

    return { result, deferredNotifications };
  });
}

export const decideRegistrationRequestUseCase = new DecideRegistrationRequestUseCase({
  registrationRequestRepository,
  runApproveTransaction,
  sendRejectionEmail: (message) => sendDirectEmail(message),
  auditRecorder,
  notificationService,
});
