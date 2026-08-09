import type { PublicDirectoryProfile, PublicDirectorySearchFilters } from "../../domain/entities";
import type { PublicDirectoryRepository } from "../ports/public-directory-repository";

/** Public, unauthenticated — no actor, no permission check (the repository's own query is the entire authorization boundary — see its doc comment). */
export class SearchPublicDirectoryUseCase {
  constructor(private readonly deps: { publicDirectoryRepository: PublicDirectoryRepository }) {}

  async execute(filters: PublicDirectorySearchFilters): Promise<PublicDirectoryProfile[]> {
    return this.deps.publicDirectoryRepository.search(filters);
  }
}
