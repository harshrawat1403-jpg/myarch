import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canManageMaintenanceIssue } from "../../domain/permissions";
import { isValidMaintenanceIssueTransition } from "../../domain/lifecycle";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import { setLinkedTaskStatus } from "../task-engine-bridge";

export interface StartMaintenanceIssueProgressInput {
  actor: AuthenticatedActor;
  issueId: string;
}

/** §3.3 — ASSIGNED/REOPENED → IN_PROGRESS. Mirrors the linked Task to IN_PROGRESS too. */
export class StartMaintenanceIssueProgressUseCase {
  constructor(
    private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: StartMaintenanceIssueProgressInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canManageMaintenanceIssue(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this issue");
    }
    if (!isValidMaintenanceIssueTransition(existing.status, "IN_PROGRESS")) {
      throw new InvalidMaintenanceIssueTransitionError(existing.status, "IN_PROGRESS");
    }

    if (existing.taskId) {
      await setLinkedTaskStatus(input.actor, existing.taskId, "IN_PROGRESS");
    }
    const updated = await this.deps.maintenanceIssueRepository.setStatus(input.issueId, "IN_PROGRESS");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_STATUS_CHANGED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
      metadata: { from: existing.status, to: "IN_PROGRESS" },
    });

    return updated;
  }
}
