import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicPlacementRow } from "../../domain/entities";
import type { PublicPlacementExportRepository } from "../ports/public-placement-export-repository";
import { resolveBatchScopedExportAccess } from "../authorize-export-scope";

export interface GeneratePublicPlacementExportInput {
  actor: AuthenticatedActor;
}

/**
 * "Intended to become the data source for the future Placement Brochure
 * Builder." The repository implementation queries StudentPublicProfile as
 * its root — the same structural guarantee the recruiters module uses
 * (Days 8–9): a student who is DRAFT/PENDING_REVIEW/CHANGES_REQUESTED has
 * no row there at all, so "approved only" is true by construction.
 */
export class GeneratePublicPlacementExportUseCase {
  constructor(private readonly deps: { repository: PublicPlacementExportRepository }) {}

  async execute(input: GeneratePublicPlacementExportInput): Promise<PublicPlacementRow[]> {
    const scope = resolveBatchScopedExportAccess(input.actor);
    if (!scope) {
      throw new NotAuthorizedError("Not authorized to export the public placement dataset");
    }

    return this.deps.repository.fetch(scope);
  }
}
