import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePlacementDrive } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PlacementDriveRecord, UpdatePlacementDriveData } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import { PlacementDriveNotFoundError } from "../../domain/errors";

export interface UpdatePlacementDriveInput {
  actor: AuthenticatedActor;
  driveId: string;
  data: UpdatePlacementDriveData;
}

export class UpdatePlacementDriveUseCase {
  constructor(private readonly deps: { placementDriveRepository: PlacementDriveRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdatePlacementDriveInput): Promise<PlacementDriveRecord> {
    const existing = await this.deps.placementDriveRepository.findById(input.driveId);
    if (!existing) throw new PlacementDriveNotFoundError();

    // Two independent checks, not a union of the two batch lists: the actor
    // must already be authorized to touch the drive as it exists today, AND
    // — if this update changes eligibility — every one of the NEW batches
    // must also be within their scope. A union check would let a Coordinator
    // scoped only to batch-a use an update to a batch-a drive to add an
    // unrelated batch-q, which they have no assignment to.
    if (!canManagePlacementDrive(input.actor, existing.eligibility.eligibleBatchIds)) {
      throw new NotAuthorizedError("Not authorized to update this placement drive");
    }
    if (input.data.eligibility && !canManagePlacementDrive(input.actor, input.data.eligibility.eligibleBatchIds)) {
      throw new NotAuthorizedError("Not authorized to move this drive's eligibility outside your assigned batches");
    }

    const updated = await this.deps.placementDriveRepository.update(input.driveId, input.data);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PLACEMENT_DRIVE_UPDATED,
      targetEntityType: "PlacementDrive",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
