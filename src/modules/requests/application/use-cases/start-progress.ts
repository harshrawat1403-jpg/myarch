import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { isValidRequestTransition } from "../../domain/lifecycle";
import { InvalidRequestTransitionError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import { setLinkedTaskStatus } from "../task-engine-bridge";

export interface StartRequestProgressInput {
  actor: AuthenticatedActor;
  requestId: string;
}

/** §3.7 — ASSIGNED → IN_PROGRESS. Mirrors the linked Task to IN_PROGRESS too. */
export class StartRequestProgressUseCase {
  constructor(private readonly deps: { requestRepository: RequestRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: StartRequestProgressInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this request");
    }
    if (!isValidRequestTransition(existing.status, "IN_PROGRESS")) {
      throw new InvalidRequestTransitionError(existing.status, "IN_PROGRESS");
    }

    if (existing.taskId) {
      await setLinkedTaskStatus(input.actor, existing.taskId, "IN_PROGRESS");
    }
    const updated = await this.deps.requestRepository.setStatus(input.requestId, "IN_PROGRESS");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_STATUS_CHANGED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
      metadata: { from: existing.status, to: "IN_PROGRESS" },
    });

    return updated;
  }
}
