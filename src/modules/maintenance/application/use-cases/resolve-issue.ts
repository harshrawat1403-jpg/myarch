import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canManageMaintenanceIssue } from "../../domain/permissions";
import { isValidMaintenanceIssueTransition } from "../../domain/lifecycle";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import { setLinkedTaskStatus } from "../task-engine-bridge";

export interface ResolveMaintenanceIssueInput {
  actor: AuthenticatedActor;
  issueId: string;
  resolutionDetails: string;
}

/** §3.3/§3.4 — IN_PROGRESS → RESOLVED. Marks the linked Task DONE and notifies the complainant (§3.4: "When resolved: notify complainant, show resolution"). */
export class ResolveMaintenanceIssueUseCase {
  constructor(
    private readonly deps: {
      maintenanceIssueRepository: MaintenanceIssueRepository;
      notificationService: NotificationService;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: ResolveMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canManageMaintenanceIssue(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to resolve this issue");
    }
    if (!isValidMaintenanceIssueTransition(existing.status, "RESOLVED")) {
      throw new InvalidMaintenanceIssueTransitionError(existing.status, "RESOLVED");
    }

    if (existing.taskId) {
      await setLinkedTaskStatus(input.actor, existing.taskId, "DONE");
    }
    const updated = await this.deps.maintenanceIssueRepository.resolve(input.issueId, input.resolutionDetails.trim());

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_RESOLVED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: updated.id,
    });

    await this.deps.notificationService.notify({
      recipientUserId: updated.requesterId,
      template: "MAINTENANCE_ISSUE_RESOLVED",
      context: { issueId: updated.id, location: updated.location },
    });

    return updated;
  }
}
