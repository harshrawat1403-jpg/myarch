import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import { renderEmailTemplate } from "@/modules/notifications/application/templates/render";
import type { RenderedEmailMessage } from "@/modules/notifications/application/ports/email-provider";
import type { MaintenanceIssueRecord } from "../../domain/entities";
import { canResolveMaintenanceIssue } from "../../domain/permissions";
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
      /**
       * Only used when the issue was reported anonymously (requesterId
       * null) — there is no User account to notify through the normal
       * userId-keyed NotificationService path, so this reuses the same
       * direct-send bypass sendDirectEmail already provides for
       * accounts-less recipients (see notifications/infrastructure/
       * container.ts's own doc comment on that function). Best-effort,
       * matching every other direct-send call site.
       */
      sendPublicReporterEmail: (message: RenderedEmailMessage) => Promise<void>;
    },
  ) {}

  async execute(input: ResolveMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const existing = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!existing) throw new MaintenanceIssueNotFoundError();
    if (!canResolveMaintenanceIssue(input.actor, existing)) {
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

    if (updated.requesterId) {
      await this.deps.notificationService.notify({
        recipientUserId: updated.requesterId,
        template: "MAINTENANCE_ISSUE_RESOLVED",
        context: { issueId: updated.id, location: updated.location },
      });
    } else if (updated.publicReporterEmail) {
      const rendered = renderEmailTemplate(
        "MAINTENANCE_ISSUE_RESOLVED",
        { issueId: updated.id, location: updated.location },
        updated.publicReporterEmail,
      );
      await this.deps.sendPublicReporterEmail(rendered).catch((err: unknown) => {
        console.error("[maintenance] failed to notify public reporter of resolution", err);
      });
    }

    return updated;
  }
}
