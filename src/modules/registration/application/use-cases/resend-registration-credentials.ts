import type { AdminResetPasswordInput, AdminResetPasswordResult, AuthenticatedActor } from "@/modules/auth";
import { canDecideRegistrationRequest } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationRequest, NotificationService } from "@/modules/notifications";
import {
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../domain/errors";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";

export interface ResendRegistrationCredentialsInput {
  readonly actor: AuthenticatedActor;
  readonly requestId: string;
}

export interface RegistrationCredentialsTransactionContext {
  resetPassword: (input: AdminResetPasswordInput) => Promise<AdminResetPasswordResult>;
  auditRecorder: AuditRecorder;
}

/**
 * Secretary-only recovery for an approved registration. It never retrieves
 * an earlier password: AdminResetPasswordUseCase creates, hashes, and stores
 * a fresh temporary credential while revoking existing sessions.
 */
export class ResendRegistrationCredentialsUseCase {
  constructor(private readonly deps: {
    registrationRequestRepository: RegistrationRequestRepository;
    runCredentialsResetTransaction: <T>(
      fn: (ctx: RegistrationCredentialsTransactionContext) => Promise<T>,
    ) => Promise<{ result: T; deferredNotifications: NotificationRequest[] }>;
    sendAccountCredentialsEmail: (input: {
      recipientName: string;
      recipientEmail: string;
      temporaryPassword: string;
    }) => Promise<boolean>;
    notificationService: NotificationService;
  }) {}

  async execute(input: ResendRegistrationCredentialsInput): Promise<{
    tempPassword: string;
    credentialsEmailSent: boolean;
  }> {
    if (!canDecideRegistrationRequest(input.actor)) {
      throw new NotAuthorizedError("Not authorized to resend registration credentials");
    }

    const request = await this.deps.registrationRequestRepository.findById(input.requestId);
    if (!request) throw new RegistrationRequestNotFoundError();
    if (request.status !== "APPROVED" || !request.resultingStudentProfileId) {
      throw new InvalidRegistrationTransitionError("Credentials can be resent only after a student account is created");
    }

    const target = await this.deps.registrationRequestRepository.findCredentialsTarget(input.requestId);
    if (!target) {
      throw new InvalidRegistrationTransitionError("The approved student account is unavailable");
    }

    const { result, deferredNotifications } = await this.deps.runCredentialsResetTransaction(async (ctx) => {
      const { tempPassword } = await ctx.resetPassword({
        actor: input.actor,
        targetUserId: target.userId,
        targetRole: "STUDENT",
        targetBatchId: target.batchId,
        recipientName: target.fullName,
      });
      await ctx.auditRecorder.record({
        actorUserId: input.actor.userId,
        action: AUDIT_ACTIONS.REGISTRATION_CREDENTIALS_RESENT,
        targetEntityType: "RegistrationRequest",
        targetEntityId: request.id,
      });
      return { tempPassword };
    });

    for (const deferred of deferredNotifications) {
      await this.deps.notificationService.notify(deferred);
    }

    const credentialsEmailSent = await this.deps
      .sendAccountCredentialsEmail({
        recipientName: target.fullName,
        recipientEmail: target.email,
        temporaryPassword: result.tempPassword,
      })
      .catch(() => false);

    return { tempPassword: result.tempPassword, credentialsEmailSent };
  }
}
