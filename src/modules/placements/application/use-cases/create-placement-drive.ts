import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePlacementDrive } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { DriveEligibility, PlacementDriveRecord, PlacementDriveType } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";

export interface CreatePlacementDriveInput {
  actor: AuthenticatedActor;
  companyId: string;
  title: string;
  type: PlacementDriveType;
  eligibility: DriveEligibility;
  packageOrStipend?: string;
  description?: string;
  applicationDeadline?: Date;
}

/** V4.0 D1 — always creates a DRAFT drive; publishing (making it visible) is a separate, Secretary-only decision (PublishPlacementDriveUseCase). */
export class CreatePlacementDriveUseCase {
  constructor(private readonly deps: { placementDriveRepository: PlacementDriveRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CreatePlacementDriveInput): Promise<PlacementDriveRecord> {
    if (!canManagePlacementDrive(input.actor, input.eligibility.eligibleBatchIds)) {
      throw new NotAuthorizedError("Not authorized to create a placement drive for these batches");
    }

    const drive = await this.deps.placementDriveRepository.create({
      companyId: input.companyId,
      title: input.title,
      type: input.type,
      eligibility: input.eligibility,
      packageOrStipend: input.packageOrStipend,
      description: input.description,
      applicationDeadline: input.applicationDeadline,
      createdByUserId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PLACEMENT_DRIVE_CREATED,
      targetEntityType: "PlacementDrive",
      targetEntityId: drive.id,
      metadata: { title: drive.title, type: drive.type },
    });

    return drive;
  }
}
