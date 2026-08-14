import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestPriority, RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import { updateLinkedTaskDeadline } from "../task-engine-bridge";

export interface UpdateRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
  priority?: RequestPriority;
  deadline?: Date | null;
  description?: string;
}

export class UpdateRequestUseCase {
  constructor(private readonly deps: { requestRepository: RequestRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateRequestInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this request");
    }

    const updated = await this.deps.requestRepository.update(input.requestId, {
      priority: input.priority,
      deadline: input.deadline,
      description: input.description?.trim(),
    });

    if (input.deadline !== undefined && existing.taskId) {
      await updateLinkedTaskDeadline(input.actor, existing.taskId, input.deadline);
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_UPDATED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
