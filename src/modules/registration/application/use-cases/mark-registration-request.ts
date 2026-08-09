import type { AuthenticatedActor } from "@/modules/auth";
import { canReviewRegistrationRequest } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RegistrationRequestRecord } from "../../domain/entities";
import { InvalidRegistrationTransitionError, RegistrationRequestNotFoundError } from "../../domain/errors";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";
import type { RegistrationReviewerLookup } from "../ports/registration-reviewer-lookup";

const DECIDED_STATUSES: RegistrationRequestRecord["status"][] = ["APPROVED", "REJECTED"];

export interface MarkRegistrationRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
  status: "REVIEWED" | "NEEDS_ATTENTION";
  comment: string;
}

/**
 * Coordinator (or Secretary) leaves a comment and marks the request
 * Reviewed/Needs Attention — advisory context for the Secretary's eventual
 * decision (B3), never a decision itself (§9: "Cannot decide").
 */
export class MarkRegistrationRequestUseCase {
  constructor(
    private readonly deps: {
      registrationRequestRepository: RegistrationRequestRepository;
      auditRecorder: AuditRecorder;
      reviewerLookup: RegistrationReviewerLookup;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: MarkRegistrationRequestInput): Promise<RegistrationRequestRecord> {
    const existing = await this.deps.registrationRequestRepository.findById(input.requestId);
    if (!existing) throw new RegistrationRequestNotFoundError();

    if (!canReviewRegistrationRequest(input.actor, existing.batchId)) {
      throw new NotAuthorizedError("Not authorized to review this registration request");
    }

    if (DECIDED_STATUSES.includes(existing.status)) {
      throw new InvalidRegistrationTransitionError("This request has already been decided");
    }

    if (!input.comment.trim()) {
      throw new InvalidRegistrationTransitionError("A comment is required");
    }

    const updated = await this.deps.registrationRequestRepository.mark(input.requestId, {
      status: input.status,
      coordinatorComment: input.comment.trim(),
      reviewedByUserId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REGISTRATION_REQUEST_MARKED,
      targetEntityType: "RegistrationRequest",
      targetEntityId: existing.id,
      metadata: { status: input.status },
    });

    // notify() never rejects (NFR-AVAIL-03) — safe to await without a
    // try/catch of our own, matching every other call site in this codebase.
    const secretaryUserIds = await this.deps.reviewerLookup.listSecretaryUserIds();
    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "REGISTRATION_REVIEWED",
          context: { applicantName: existing.fullName, status: input.status, requestId: existing.id },
        }),
      ),
    );

    return updated;
  }
}
