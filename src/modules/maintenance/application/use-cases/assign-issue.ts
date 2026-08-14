import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canAssignMaintenanceIssue } from "../../domain/permissions";
import { isValidMaintenanceIssueTransition } from "../../domain/lifecycle";
import {
  InvalidMaintenanceAssigneeError,
  InvalidMaintenanceIssueTransitionError,
  MaintenanceIssueNotFoundError,
} from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import type { UserRoleLookup } from "../ports/user-role-lookup";
import { createLinkedTask } from "../task-engine-bridge";

export interface AssignMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
  assigneeId: string;
  deadline?: Date | null;
}

/**
 * §3.5 — the moment a MaintenanceIssue gets a doer AND its SLA/reminder/
 * overdue/escalation backing: creates exactly one linked Task here (see
 * application/task-engine-bridge.ts), never before. Valid from ACKNOWLEDGED
 * (first assignment) or REOPENED (an issue resuming after being reopened
 * with no assignee carried over is re-assigned the same way).
 */
export class AssignMaintenanceIssueUseCase {
  constructor(
    private readonly deps: {
      maintenanceIssueRepository: MaintenanceIssueRepository;
      userRoleLookup: UserRoleLookup;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: AssignMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canAssignMaintenanceIssue(input.actor)) {
      throw new NotAuthorizedError("Not authorized to assign maintenance issues");
    }
    if (!isValidMaintenanceIssueTransition(existing.status, "ASSIGNED")) {
      throw new InvalidMaintenanceIssueTransitionError(existing.status, "ASSIGNED");
    }

    const assigneeRole = await this.deps.userRoleLookup.findRoleByUserId(input.assigneeId);
    if (assigneeRole !== "SECRETARY" && assigneeRole !== "COORDINATOR") {
      throw new InvalidMaintenanceAssigneeError();
    }

    const deadline = input.deadline ?? null;
    const task = await createLinkedTask({
      actor: input.actor,
      title: `Maintenance: ${existing.category} — ${existing.location}`,
      ownerId: input.assigneeId,
      deadline,
      relatedEntityType: "MaintenanceIssue",
      relatedEntityId: existing.id,
    });

    const updated = await this.deps.maintenanceIssueRepository.assign(input.issueId, input.assigneeId, task.id, deadline);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_ASSIGNED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
      metadata: { assigneeId: input.assigneeId, taskId: task.id },
    });

    return updated;
  }
}
