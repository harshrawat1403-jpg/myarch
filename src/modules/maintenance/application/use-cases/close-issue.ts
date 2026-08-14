import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canManageMaintenanceIssue } from "../../domain/permissions";
import { isValidMaintenanceIssueTransition } from "../../domain/lifecycle";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";

export interface CloseMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
}

/** §3.3 — VERIFIED → CLOSED. */
export class CloseMaintenanceIssueUseCase {
  constructor(
    private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: CloseMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canManageMaintenanceIssue(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to close this issue");
    }
    if (!isValidMaintenanceIssueTransition(existing.status, "CLOSED")) {
      throw new InvalidMaintenanceIssueTransitionError(existing.status, "CLOSED");
    }

    const updated = await this.deps.maintenanceIssueRepository.setStatus(input.issueId, "CLOSED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_CLOSED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
