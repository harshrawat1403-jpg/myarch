import type { NotificationService } from "@/modules/notifications";
import type { MaintenanceCategory, MaintenanceIssueRecord, MaintenancePriority } from "../../domain/entities";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";

export interface ReportPublicMaintenanceIssueInput {
  /** The anonymous complainant's own contact info — never an AuthenticatedActor; this path has no session to check. */
  name: string;
  email: string;
  category: MaintenanceCategory;
  location: string;
  description: string;
  priority?: MaintenancePriority;
}

export interface ReportPublicMaintenanceIssueUseCaseDeps {
  maintenanceIssueRepository: MaintenanceIssueRepository;
  secretaryRecipientLookup: SecretaryRecipientLookup;
  notificationService: NotificationService;
}

/**
 * MYARCH public Maintenance reporting — the unauthenticated counterpart to
 * ReportMaintenanceIssueUseCase, for the public /maintenance/report page.
 * Deliberately a separate class, not a branch inside the existing one:
 * ReportMaintenanceIssueUseCase's canReportMaintenanceIssue check is a real,
 * tested authorization boundary (SECRETARY/COORDINATOR/STUDENT only) that
 * must never be blurred by an "actor is optional" input shape — this class
 * has no actor at all, by design, and is exactly as public as the route
 * that calls it (rate-limited there, not here — see the route handler).
 *
 * Reuses everything else: the same MaintenanceIssueRepository (issue lands
 * in the exact same table, same lifecycle, same Task Engine linkage once
 * staff assign it), the same secretary-notification fan-out
 * ReportMaintenanceIssueUseCase already does. The only two deliberate
 * differences from the authenticated path:
 *
 *  - No MAINTENANCE_ISSUE_REPORTED audit entry. AuditLog.actorUserId is a
 *    required FK to a real User — there is no real actor here, and this
 *    amendment's own design review chose NOT to widen that column (a
 *    heavily shared table) or invent a sentinel "system" User row just to
 *    attribute this one event. The created issue row itself (createdAt +
 *    publicReporterName/Email) already carries the same information an
 *    audit entry would. Every subsequent STAFF action on this issue
 *    (acknowledge/assign/resolve/...) still goes through the existing,
 *    unmodified use cases and is fully audited exactly as before.
 *  - No attachment support — see AddMaintenanceAttachmentUseCase's own
 *    actor-gated design; anonymous photo upload is deliberately out of
 *    scope for this first implementation (see the design review).
 */
export class ReportPublicMaintenanceIssueUseCase {
  constructor(private readonly deps: ReportPublicMaintenanceIssueUseCaseDeps) {}

  async execute(input: ReportPublicMaintenanceIssueInput): Promise<MaintenanceIssueRecord> {
    const issue = await this.deps.maintenanceIssueRepository.create({
      category: input.category,
      location: input.location.trim(),
      description: input.description.trim(),
      priority: input.priority,
      publicReporterName: input.name.trim(),
      publicReporterEmail: input.email.trim().toLowerCase(),
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
