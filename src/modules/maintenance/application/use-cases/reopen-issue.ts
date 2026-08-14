import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { isReopenableMaintenanceIssue } from "../../domain/entities";
import { canReopenMaintenanceIssue } from "../../domain/permissions";
import { MaintenanceIssueNotFoundError, MaintenanceIssueNotReopenableError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import { reopenLinkedTask } from "../task-engine-bridge";

export interface ReopenMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
}

/** §3.4/§3.5 — "allow Reopen," available to the complainant or whoever manages the issue, from RESOLVED/VERIFIED/CLOSED. Reopens the linked Task too (DONE → TODO) if one exists. */
export class ReopenMaintenanceIssueUseCase {
  constructor(
    private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: ReopenMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canReopenMaintenanceIssue(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to reopen this issue");
    }
    if (!isReopenableMaintenanceIssue(existing.status)) {
      throw new MaintenanceIssueNotReopenableError();
    }

    if (existing.taskId) {
      await reopenLinkedTask(input.actor, existing.taskId);
    }
    const updated = await this.deps.maintenanceIssueRepository.reopen(input.issueId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_REOPENED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
      metadata: { previousStatus: existing.status },
    });

    return updated;
  }
}
