import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestRecord } from "../../domain/entities";
import { canManageRequest } from "../../domain/permissions";
import { InvalidRequestOwnerError, RequestNotApprovedError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import type { UserRoleLookup } from "../ports/user-role-lookup";
import { createLinkedTask } from "../task-engine-bridge";

export interface AssignRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
  ownerId: string;
  deadline?: Date | null;
}

/** §3.7 — the moment an APPROVED request gets an owner AND its SLA/reminder/overdue/escalation backing: creates exactly one linked Task here, mirroring AssignMaintenanceIssueUseCase exactly. */
export class AssignRequestUseCase {
  constructor(
    private readonly deps: {
      requestRepository: RequestRepository;
      userRoleLookup: UserRoleLookup;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: AssignRequestInput): Promise<RequestRecord> {
    const existing = await this.deps.requestRepository.findById(input.requestId);
    if (!existing) throw new RequestNotFoundError();
    if (!canManageRequest(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to assign this request");
    }
    if (existing.status !== "REVIEW" || existing.decision !== "APPROVED") {
      throw new RequestNotApprovedError();
    }

    const ownerRole = await this.deps.userRoleLookup.findRoleByUserId(input.ownerId);
    if (ownerRole !== "SECRETARY" && ownerRole !== "COORDINATOR") {
      throw new InvalidRequestOwnerError();
    }

    const deadline = input.deadline ?? null;
    const task = await createLinkedTask({
      actor: input.actor,
      title: `Request: ${existing.type}`,
      ownerId: input.ownerId,
      deadline,
      relatedEntityId: existing.id,
    });

    const updated = await this.deps.requestRepository.assign(input.requestId, input.ownerId, task.id, deadline);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_ASSIGNED,
      targetEntityType: "Request",
      targetEntityId: updated.id,
      metadata: { ownerId: input.ownerId, taskId: task.id },
    });

    return updated;
  }
}
