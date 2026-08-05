import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterDirectoryRow } from "../../domain/entities";
import type { RecruiterDirectoryExportRepository } from "../ports/recruiter-directory-export-repository";

export interface GenerateRecruiterDirectoryExportInput {
  actor: AuthenticatedActor;
}

/**
 * Secretary-only, not "batch-scoped" — Recruiter accounts have no batch
 * dimension at all, so a Coordinator has no meaningful "batch-scoped view"
 * of this export. Read literally, "Coordinator: batch-scoped exports
 * only" means a Coordinator's access is limited to what CAN be scoped by
 * batch; an export with no batch dimension is therefore out of reach for
 * that role, not silently unscoped. Flagged as an interpretation in this
 * phase's implementation summary, not assumed silently.
 */
export class GenerateRecruiterDirectoryExportUseCase {
  constructor(private readonly deps: { repository: RecruiterDirectoryExportRepository }) {}

  async execute(input: GenerateRecruiterDirectoryExportInput): Promise<RecruiterDirectoryRow[]> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to export the recruiter directory");
    }

    return this.deps.repository.fetch();
  }
}
