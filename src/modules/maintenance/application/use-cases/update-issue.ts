import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord, MaintenancePriority } from "../../domain/entities";
import { canManageMaintenanceIssue } from "../../domain/permissions";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import { updateLinkedTaskDeadline } from "../task-engine-bridge";

export interface UpdateMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
  priority?: MaintenancePriority;
  deadline?: Date | null;
  description?: string;
}

/** §3.5 — "change priority, set deadline." A deadline change propagates to the linked Task (if any), which reschedules its own overdue-check job for free — see UpdateTaskUseCase. */
export class UpdateMaintenanceIssueUseCase {
  constructor(
    private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: UpdateMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canManageMaintenanceIssue(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this issue");
    }

    const updated = await this.deps.maintenanceIssueRepository.update(input.issueId, {
      priority: input.priority,
      deadline: input.deadline,
      description: input.description?.trim(),
    });

    if (input.deadline !== undefined && existing.taskId) {
      await updateLinkedTaskDeadline(input.actor, existing.taskId, input.deadline);
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_UPDATED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
