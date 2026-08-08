import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessUserDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { DirectoryEntry, DirectorySearchFilters } from "../../domain/entities";
import type { DirectoryRepository } from "../ports/directory-repository";

export interface SearchUserDirectoryInput {
  actor: AuthenticatedActor;
  filters: DirectorySearchFilters;
}

export class SearchUserDirectoryUseCase {
  constructor(private readonly deps: { directoryRepository: DirectoryRepository }) {}

  async execute(input: SearchUserDirectoryInput): Promise<DirectoryEntry[]> {
    if (!canAccessUserDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view the user directory");
    }

    // A Coordinator's scope narrows the result set to Students within
    // their assigned batches (see PrismaDirectoryRepository) — a Secretary
    // gets an unscoped search across every role.
    const scope = input.actor.role === "COORDINATOR" ? { batchIds: input.actor.batchScope ?? [] } : {};

    return this.deps.directoryRepository.search(input.filters, scope);
  }
}
