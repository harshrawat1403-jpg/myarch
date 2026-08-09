import type { AuthenticatedActor } from "@/modules/auth";
import { canManageAlumni } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AlumniRecord, AlumniSearchFilters } from "../../domain/entities";
import type { AlumniRepository } from "../ports/alumni-repository";

export interface SearchAlumniInput {
  actor: AuthenticatedActor;
  filters: AlumniSearchFilters;
}

export class SearchAlumniUseCase {
  constructor(private readonly deps: { alumniRepository: AlumniRepository }) {}

  async execute(input: SearchAlumniInput): Promise<AlumniRecord[]> {
    if (!canManageAlumni(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view alumni records");
    }
    return this.deps.alumniRepository.search(input.filters);
  }
}
