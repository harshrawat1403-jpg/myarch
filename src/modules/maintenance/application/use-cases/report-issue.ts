import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { MaintenanceCategory, MaintenanceIssueRecord, MaintenancePriority } from "../../domain/entities";
import { canReportMaintenanceIssue } from "../../domain/permissions";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";

export interface ReportMaintenanceIssueInput {
  actor: AuthenticatedActor;
  category: MaintenanceCategory;
  location: string;
  description: string;
  priority?: MaintenancePriority;
}

export interface ReportMaintenanceIssueUseCaseDeps {
  maintenanceIssueRepository: MaintenanceIssueRepository;
  secretaryRecipientLookup: SecretaryRecipientLookup;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
}

/** §3.1/§3.2 — the complainant's entry point. No linked Task is created yet (see this module's own README-style doc comment in domain/entities.ts) — one is created only once AssignMaintenanceIssueUseCase gives it an owner. */
export class ReportMaintenanceIssueUseCase {
  constructor(private readonly deps: ReportMaintenanceIssueUseCaseDeps) {}

  async execute(input: ReportMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    if (!canReportMaintenanceIssue(input.actor)) {
      throw new NotAuthorizedError("Not authorized to report a maintenance issue");
    }

    const issue = await this.deps.maintenanceIssueRepository.create({
      category: input.category,
      location: input.location.trim(),
      description: input.description.trim(),
      priority: input.priority,
      requesterId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ISSUE_REPORTED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: issue.id,
      metadata: { category: issue.category, location: issue.location },
    });

    const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "MAINTENANCE_ISSUE_SUBMITTED",
          context: { issueId: issue.id, category: issue.category, location: issue.location },
        }),
      ),
    );

    return issue;
  }
}
