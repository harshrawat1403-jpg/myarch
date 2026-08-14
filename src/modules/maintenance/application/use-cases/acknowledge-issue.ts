import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canManageMaintenanceIssue } from "../../domain/permissions";
import { isValidMaintenanceIssueTransition } from "../../domain/lifecycle";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";

export interface AcknowledgeMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
}

/** §3.3 — SUBMITTED → ACKNOWLEDGED. Whoever will go on to assign/manage it acknowledges it exists first. */
export class AcknowledgeMaintenanceIssueUseCase {
  constructor(
    private readonly deps: { maintenanceIssueRepository: MaintenanceIssueRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: AcknowledgeMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canManageMaintenanceIssue(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to acknowledge this issue");
    }
    if (!isValidMaintenanceIssueTransition(existing.status, "ACKNOWLEDGED")) {
      throw new InvalidMaintenanceIssueTransitionError(existing.status, "ACKNOWLEDGED");
    }

    const updated = await this.deps.maintenanceIssueRepository.acknowledge(input.issueId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_ACKNOWLEDGED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
