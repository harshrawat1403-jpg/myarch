import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { ApplicationRecord, ApplicationStatus } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import type { InternshipOutcomeRepository } from "../ports/internship-outcome-repository";
import { isValidApplicationStatusTransition } from "../../domain/application-lifecycle";
import {
  ApplicationNotFoundError,
  InvalidApplicationStatusTransitionError,
  PlacementDriveNotFoundError,
} from "../../domain/errors";

export interface UpdateApplicationStatusInput {
  actor: AuthenticatedActor;
  applicationId: string;
  toStatus: ApplicationStatus;
  note?: string;
}

/**
 * V4.0 D1 (§11) — Secretary/Coordinator(scoped to the applying student's
 * batch) moves an application through the pipeline, recording an
 * ApplicationStatusEvent for every transition. V4.0 D4 (§5.1): reaching
 * ACTIVE on an INTERNSHIP drive automatically creates the one-per-Application
 * InternshipOutcome row (never a separate manual step — "InternshipOutcome
 * attached once ACTIVE is reached"); reaching COMPLETED stamps that same
 * row's completedAt, so it can never drift from the Application's own
 * currentStatus.
 */
export class UpdateApplicationStatusUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      placementDriveRepository: PlacementDriveRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
      internshipOutcomeRepository: InternshipOutcomeRepository;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: UpdateApplicationStatusInput): Promise<ApplicationRecord> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
    if (!student || !canManageApplication(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to update this application");
    }

    const drive = await this.deps.placementDriveRepository.findById(application.placementDriveId);
    if (!drive) throw new PlacementDriveNotFoundError();

    if (!isValidApplicationStatusTransition(application.currentStatus, input.toStatus, drive.type)) {
      throw new InvalidApplicationStatusTransitionError(application.currentStatus, input.toStatus);
    }

    const updated = await this.deps.applicationRepository.transitionStatus(
      input.applicationId,
      application.currentStatus,
      input.toStatus,
      input.actor.userId,
      input.note ?? null,
    );

    if (input.toStatus === "ACTIVE" && drive.type === "INTERNSHIP") {
      const existingOutcome = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
      if (!existingOutcome) {
        await this.deps.internshipOutcomeRepository.create(input.applicationId);
      }
    } else if (input.toStatus === "COMPLETED") {
      const existingOutcome = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
      if (existingOutcome) {
        await this.deps.internshipOutcomeRepository.setCompletedAt(input.applicationId, new Date());
      }
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
      targetEntityType: "Application",
      targetEntityId: updated.id,
      metadata: { fromStatus: application.currentStatus, toStatus: updated.currentStatus },
    });

    // V4.0 E2 (§12: APPLICATION_STATUS_CHANGED) — `student` was already
    // fetched above for the permission check, now reused for its userId
    // rather than a second lookup. notify() never rejects (NFR-AVAIL-03) —
    // safe to await without a try/catch of our own.
    await this.deps.notificationService.notify({
      recipientUserId: student.userId,
      template: "APPLICATION_STATUS_CHANGED",
      context: { companyName: drive.companyName, title: drive.title, toStatus: updated.currentStatus },
    });

    return updated;
  }
}
