import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PlacementDriveRecord, PlacementDriveSearchFilters } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";

export interface SearchPlacementDrivesInput {
  actor: AuthenticatedActor;
  filters: PlacementDriveSearchFilters;
}

/**
 * V4.0 D1 — the Secretary/Coordinator drive-management list. Secretary sees
 * every drive; a Coordinator sees drives eligible for at least ONE of their
 * assigned batches — deliberately a broader (any-overlap) rule than
 * canManagePlacementDrive's full-containment requirement, so a Coordinator
 * can see a cross-batch drive that includes their batch without being able
 * to edit it (see UpdatePlacementDriveUseCase's doc comment).
 */
export class SearchPlacementDrivesUseCase {
  constructor(private readonly deps: { placementDriveRepository: PlacementDriveRepository }) {}

  async execute(input: SearchPlacementDrivesInput): Promise<PlacementDriveRecord[]> {
    if (input.actor.role !== "SECRETARY" && input.actor.role !== "COORDINATOR") {
      throw new NotAuthorizedError("Not authorized to view placement drives");
    }

    const drives = await this.deps.placementDriveRepository.search(input.filters);
    if (input.actor.role === "SECRETARY") return drives;

    const scope = input.actor.batchScope ?? [];
    return drives.filter((drive) => drive.eligibility.eligibleBatchIds.some((id) => scope.includes(id)));
  }
}
