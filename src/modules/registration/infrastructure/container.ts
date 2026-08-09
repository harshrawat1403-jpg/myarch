import { prisma } from "@/lib/prisma";
import { PrismaBatchLookup } from "@/lib/batch-lookup";
import { PrismaAuditRecorder } from "@/lib/audit";
import { getAdminResetPasswordUseCase } from "@/modules/auth";
import { getCreateStudentUseCase } from "@/modules/students";
import { sendDirectEmail, notificationService } from "@/modules/notifications";
import { SubmitRegistrationRequestUseCase } from "../application/use-cases/submit-registration-request";
import { ListRegisterableBatchesUseCase } from "../application/use-cases/list-registerable-batches";
import { SearchRegistrationRequestsUseCase } from "../application/use-cases/search-registration-requests";
import { GetRegistrationRequestUseCase } from "../application/use-cases/get-registration-request";
import { MarkRegistrationRequestUseCase } from "../application/use-cases/mark-registration-request";
import { DecideRegistrationRequestUseCase } from "../application/use-cases/decide-registration-request";
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
});

export const listRegisterableBatchesUseCase = new ListRegisterableBatchesUseCase({ registerableBatchLookup });
export const searchRegistrationRequestsUseCase = new SearchRegistrationRequestsUseCase({
  registrationRequestRepository,
});
export const getRegistrationRequestUseCase = new GetRegistrationRequestUseCase({ registrationRequestRepository });
export const markRegistrationRequestUseCase = new MarkRegistrationRequestUseCase({
  registrationRequestRepository,
  auditRecorder,
  reviewerLookup,
  notificationService,
});
export const decideRegistrationRequestUseCase = new DecideRegistrationRequestUseCase({
  registrationRequestRepository,
  createStudent: (input) => getCreateStudentUseCase().execute(input),
  resetPassword: (input) => getAdminResetPasswordUseCase().execute(input),
  sendRejectionEmail: (message) => sendDirectEmail(message),
  auditRecorder,
  notificationService,
});
