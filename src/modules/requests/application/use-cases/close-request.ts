import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { isValidRequestTransition } from "../../domain/lifecycle";
import { InvalidRequestTransitionError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";

export interface CloseRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
}

/** §3.7 — COMPLETED → CLOSED. */
export class CloseRequestUseCase {
  constructor(private readonly deps: { requestRepository: RequestRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CloseRequestInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to close this request");
    }
    if (!isValidRequestTransition(existing.status, "CLOSED")) {
      throw new InvalidRequestTransitionError(existing.status, "CLOSED");
    }

    const updated = await this.deps.requestRepository.setStatus(input.requestId, "CLOSED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_STATUS_CHANGED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
      metadata: { from: existing.status, to: "CLOSED" },
    });

    return updated;
  }
}
