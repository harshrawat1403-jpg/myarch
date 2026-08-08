import type { DirectoryEntry, DirectorySearchFilters } from "../../domain/entities";

export interface DirectoryRepository {
  /**
   * Restricted to `batchIds` when provided (a Coordinator's scope) — only
   * Student rows within that scope are returned, and Coordinator/Recruiter/
   * Secretary rows are excluded entirely, mirroring
   * PrismaStudentRepository.search's batch-boundary enforcement at the
   * query level, not a post-fetch filter.
   */
  search(
    filters: DirectorySearchFilters,
    scope: { batchIds?: readonly string[] },
  ): Promise<DirectoryEntry[]>;
}
