import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canAssignMaintenanceIssue } from "../../domain/permissions";
import { InvalidMaintenanceAssigneeError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import type { UserRoleLookup } from "../ports/user-role-lookup";
import { reassignLinkedTask } from "../task-engine-bridge";

export interface ReassignMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
  assigneeId: string;
}

/** §3.5 — "reassign." Valid only once a linked Task exists (ASSIGNED or IN_PROGRESS — see MaintenanceIssueNotFoundError-adjacent guard below). */
export class ReassignMaintenanceIssueUseCase {
  constructor(
    private readonly deps: {
      maintenanceIssueRepository: MaintenanceIssueRepository;
      userRoleLookup: UserRoleLookup;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: ReassignMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canAssignMaintenanceIssue(input.actor)) {
      throw new NotAuthorizedError("Not authorized to reassign maintenance issues");
    }
    if (!existing.taskId || (existing.status !== "ASSIGNED" && existing.status !== "IN_PROGRESS")) {
      throw new NotAuthorizedError("This issue has not been assigned yet");
    }

    const assigneeRole = await this.deps.userRoleLookup.findRoleByUserId(input.assigneeId);
    if (assigneeRole !== "SECRETARY" && assigneeRole !== "COORDINATOR") {
      throw new InvalidMaintenanceAssigneeError();
    }

    await reassignLinkedTask(input.actor, existing.taskId, input.assigneeId);
    const updated = await this.deps.maintenanceIssueRepository.reassign(input.issueId, input.assigneeId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_REASSIGNED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
      metadata: { previousAssigneeId: existing.assigneeId, newAssigneeId: input.assigneeId },
    });

    return updated;
  }
}
