import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { InvalidRequestOwnerError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import type { UserRoleLookup } from "../ports/user-role-lookup";
import { reassignLinkedTask } from "../task-engine-bridge";

export interface ReassignRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
  ownerId: string;
}

export class ReassignRequestUseCase {
  constructor(
    private readonly deps: {
      requestRepository: RequestRepository;
      userRoleLookup: UserRoleLookup;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: ReassignRequestInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to reassign this request");
    }
    if (!existing.taskId || (existing.status !== "ASSIGNED" && existing.status !== "IN_PROGRESS")) {
      throw new NotAuthorizedError("This request has not been assigned yet");
    }

    const ownerRole = await this.deps.userRoleLookup.findRoleByUserId(input.ownerId);
    if (ownerRole !== "SECRETARY" && ownerRole !== "COORDINATOR") {
      throw new InvalidRequestOwnerError();
    }

    await reassignLinkedTask(input.actor, existing.taskId, input.ownerId);
    const updated = await this.deps.requestRepository.reassign(input.requestId, input.ownerId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_REASSIGNED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
      metadata: { previousOwnerId: existing.ownerId, newOwnerId: input.ownerId },
    });

    return updated;
  }
}
