import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterSearchFilters, RecruiterStudentProfileDTO } from "../../domain/entities";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";

export interface SearchDirectoryInput {
  actor: AuthenticatedActor;
  filters: RecruiterSearchFilters;
}

export class SearchDirectoryUseCase {
  constructor(private readonly deps: { directoryRepository: RecruiterDirectoryRepository }) {}

  async execute(input: SearchDirectoryInput): Promise<RecruiterStudentProfileDTO[]> {
    // Defense in depth alongside the route's withAuth({ roles: ["RECRUITER"] })
    // gate — reuses the same centralized function every other module's
    // profile-viewing paths use, per "continue using centralized authorization."
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to browse the recruiter directory");
    }

    return this.deps.directoryRepository.search(input.filters);
  }
}
