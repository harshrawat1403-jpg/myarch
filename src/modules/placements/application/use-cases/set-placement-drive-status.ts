import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePlacementDrive } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PlacementDriveRecord, PlacementDriveStatus } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import { isValidDriveStatusTransition } from "../../domain/drive-lifecycle";
import { InvalidDriveStatusTransitionError, PlacementDriveNotFoundError } from "../../domain/errors";

export interface SetPlacementDriveStatusInput {
  actor: AuthenticatedActor;
  driveId: string;
  status: PlacementDriveStatus;
}

/**
 * V4.0 D1 — every drive status transition EXCEPT the DRAFT→ANNOUNCED
 * publish decision (see PublishPlacementDriveUseCase, which is the only
 * Secretary-only one). ANNOUNCED→IN_PROGRESS→CLOSED are ordinary
 * operational task management a scoped Coordinator may also perform (§9).
 */
export class SetPlacementDriveStatusUseCase {
  constructor(private readonly deps: { placementDriveRepository: PlacementDriveRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: SetPlacementDriveStatusInput): Promise<PlacementDriveRecord> {
    const existing = await this.deps.placementDriveRepository.findById(input.driveId);
    if (!existing) throw new PlacementDriveNotFoundError();

    if (!canManagePlacementDrive(input.actor, existing.eligibility.eligibleBatchIds)) {
      throw new NotAuthorizedError("Not authorized to update this placement drive's status");
    }
    if (!isValidDriveStatusTransition(existing.status, input.status)) {
      throw new InvalidDriveStatusTransitionError(existing.status, input.status);
    }

    const updated = await this.deps.placementDriveRepository.setStatus(input.driveId, input.status);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PLACEMENT_DRIVE_STATUS_CHANGED,
      targetEntityType: "PlacementDrive",
      targetEntityId: updated.id,
      metadata: { fromStatus: existing.status, toStatus: updated.status },
    });

    return updated;
  }
}
