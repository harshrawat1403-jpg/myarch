import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canConfirmMaintenanceResolution } from "../../domain/permissions";
import { isValidMaintenanceIssueTransition } from "../../domain/lifecycle";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";

export interface ConfirmMaintenanceResolutionInput {
  actor: AuthenticatedActor;
  issueId: string;
}

/** §3.4 — "allow Confirm Resolved." RESOLVED → VERIFIED, the complainant's own action (or the Secretary's). */
export class ConfirmMaintenanceResolutionUseCase {
  constructor(
    private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: ConfirmMaintenanceResolutionInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canConfirmMaintenanceResolution(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to confirm resolution of this issue");
    }
    if (!isValidMaintenanceIssueTransition(existing.status, "VERIFIED")) {
      throw new InvalidMaintenanceIssueTransitionError(existing.status, "VERIFIED");
    }

    const updated = await this.deps.maintenanceIssueRepository.setStatus(input.issueId, "VERIFIED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_VERIFIED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
