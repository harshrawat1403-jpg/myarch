import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { isValidRequestTransition } from "../../domain/lifecycle";
import { InvalidRequestTransitionError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";

export interface StartRequestReviewInput {
  actor: AuthenticatedActor;
  requestId: string;
}

/** §3.7 — SUBMITTED → REVIEW. */
export class StartRequestReviewUseCase {
  constructor(private readonly deps: { requestRepository: RequestRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: StartRequestReviewInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to review this request");
    }
    if (!isValidRequestTransition(existing.status, "REVIEW")) {
      throw new InvalidRequestTransitionError(existing.status, "REVIEW");
    }

    const updated = await this.deps.requestRepository.startReview(input.requestId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_STATUS_CHANGED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
      metadata: { from: existing.status, to: "REVIEW" },
    });

    return updated;
  }
}
