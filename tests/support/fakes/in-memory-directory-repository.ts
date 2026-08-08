import type {
  DirectoryEntry,
  DirectorySearchFilters,
} from "../../../src/modules/administration/domain/entities";
import type { DirectoryRepository } from "../../../src/modules/administration/application/ports/directory-repository";

export class InMemoryDirectoryRepository implements DirectoryRepository {
  private readonly entries: DirectoryEntry[] = [];

  seed(entry: DirectoryEntry): void {
    this.entries.push(entry);
  }

  async search(
    filters: DirectorySearchFilters,
    scope: { batchIds?: readonly string[] },
  ): Promise<DirectoryEntry[]> {
    const scopeSet = scope.batchIds ? new Set(scope.batchIds) : undefined;

    return this.entries
      .filter((e) => (scopeSet ? e.role === "STUDENT" && e.batchId && scopeSet.has(e.batchId) : true))
      .filter((e) => (filters.includeInactive ? true : e.isActive))
      .filter((e) => !filters.role || e.role === filters.role)
      .filter(
        (e) =>
          !filters.query ||
          e.fullName.toLowerCase().includes(filters.query.toLowerCase()) ||
          e.email.toLowerCase().includes(filters.query.toLowerCase()),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}
