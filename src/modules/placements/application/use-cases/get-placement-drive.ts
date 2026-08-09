import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PlacementDriveRecord } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import { PlacementDriveNotFoundError } from "../../domain/errors";

export interface GetPlacementDriveInput {
  actor: AuthenticatedActor;
  driveId: string;
}

/** V4.0 D1 — the Secretary/Coordinator single-drive detail read, same scoping as SearchPlacementDrivesUseCase. */
export class GetPlacementDriveUseCase {
  constructor(private readonly deps: { placementDriveRepository: PlacementDriveRepository }) {}

  async execute(input: GetPlacementDriveInput): Promise<PlacementDriveRecord> {
    if (input.actor.role !== "SECRETARY" && input.actor.role !== "COORDINATOR") {
      throw new NotAuthorizedError("Not authorized to view this placement drive");
    }

    const drive = await this.deps.placementDriveRepository.findById(input.driveId);
    if (!drive) throw new PlacementDriveNotFoundError();

    if (input.actor.role === "COORDINATOR") {
      const scope = input.actor.batchScope ?? [];
      const inScope = drive.eligibility.eligibleBatchIds.some((id) => scope.includes(id));
      if (!inScope) throw new NotAuthorizedError("This drive is outside your assigned scope");
    }

    return drive;
  }
}
