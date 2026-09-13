import type {
  AuthenticatedActor,
  EmailVerificationDeliveryResult,
  IssueEmailVerificationTokenInput,
} from "@/modules/auth";
import { canDecideRegistrationRequest } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import {
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../domain/errors";
import type { RegistrationRequestRecord } from "../../domain/entities";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";

const PENDING_STATUSES: RegistrationRequestRecord["status"][] = [
  "SUBMITTED",
  "REVIEWED",
  "NEEDS_ATTENTION",
];

export interface ResendRegistrationVerificationInput {
  actor: AuthenticatedActor;
  requestId: string;
}

/**
 * Recovers an unverified registration without creating an account or
 * weakening approval. This deliberately issues a token from the selected
 * RegistrationRequest instead of relying on an older token to exist, so
 * registrations created before email verification was introduced remain
 * recoverable.
 */
export class ResendRegistrationVerificationUseCase {
  constructor(private readonly deps: {
    registrationRequestRepository: RegistrationRequestRepository;
    issueEmailVerificationToken: (input: IssueEmailVerificationTokenInput) => Promise<EmailVerificationDeliveryResult>;
    auditRecorder: AuditRecorder;
  }) {}

  async execute(input: ResendRegistrationVerificationInput): Promise<{ resent: boolean; emailSent?: boolean }> {
    if (!canDecideRegistrationRequest(input.actor)) {
      throw new NotAuthorizedError("Not authorized to resend registration verification emails");
    }

    const request = await this.deps.registrationRequestRepository.findById(input.requestId);
    if (!request) throw new RegistrationRequestNotFoundError();
    if (!PENDING_STATUSES.includes(request.status)) {
      throw new InvalidRegistrationTransitionError("This request has already been decided");
    }
    if (request.emailVerifiedAt) return { resent: false };

    const delivery = await this.deps.issueEmailVerificationToken({
      email: request.email,
      recipientName: request.fullName,
      registrationRequestId: request.id,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REGISTRATION_VERIFICATION_RESENT,
      targetEntityType: "RegistrationRequest",
      targetEntityId: request.id,
      metadata: { emailSent: delivery.emailSent },
    });

    return { resent: true, emailSent: delivery.emailSent };
  }
}
