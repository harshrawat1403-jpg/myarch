import type { AuthenticatedActor } from "@/modules/auth";
import { canPublishPlacementDrive } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PlacementDriveRecord } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { DriveNotDraftError, PlacementDriveNotFoundError } from "../../domain/errors";

export interface PublishPlacementDriveInput {
  actor: AuthenticatedActor;
  driveId: string;
}

/** V4.0 D1 (§4 — "Coordinator: Scoped, no publish") — the DRAFT→ANNOUNCED transition, Secretary-only regardless of batch scope. */
export class PublishPlacementDriveUseCase {
  constructor(
    private readonly deps: {
      placementDriveRepository: PlacementDriveRepository;
      auditRecorder: AuditRecorder;
      studentEligibilityLookup: StudentEligibilityLookup;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: PublishPlacementDriveInput): Promise<PlacementDriveRecord> {
    if (!canPublishPlacementDrive(input.actor)) {
      throw new NotAuthorizedError("Not authorized to publish placement drives");
    }

    const existing = await this.deps.placementDriveRepository.findById(input.driveId);
    if (!existing) throw new PlacementDriveNotFoundError();
    if (existing.status !== "DRAFT") throw new DriveNotDraftError();

    const updated = await this.deps.placementDriveRepository.setStatus(input.driveId, "ANNOUNCED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PLACEMENT_DRIVE_PUBLISHED,
      targetEntityType: "PlacementDrive",
      targetEntityId: updated.id,
    });

    // V4.0 E2 (§12: PLACEMENT_DRIVE_ANNOUNCED) — batch-only fan-out,
    // deliberately matching ListOpenDrivesForStudentUseCase's own
    // visibility filter (see listUserIdsForBatches's own doc comment for
    // why minCgpa/backlogAllowance aren't re-checked here). notify() never
    // rejects (NFR-AVAIL-03) — safe to await without a try/catch of our own.
    const eligibleUserIds = await this.deps.studentEligibilityLookup.listUserIdsForBatches(updated.eligibility.eligibleBatchIds);
    await Promise.all(
      eligibleUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "PLACEMENT_DRIVE_ANNOUNCED",
          context: { companyName: updated.companyName, title: updated.title, type: updated.type },
        }),
      ),
    );

    return updated;
  }
}
