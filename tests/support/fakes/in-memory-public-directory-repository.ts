import type { PublicDirectoryProfile, PublicDirectorySearchFilters } from "../../../src/modules/public-directory";
import type { PublicDirectoryRepository } from "../../../src/modules/public-directory/application/ports/public-directory-repository";

export class InMemoryPublicDirectoryRepository implements PublicDirectoryRepository {
  private readonly byId = new Map<string, PublicDirectoryProfile>();

  seed(profile: PublicDirectoryProfile): void {
    this.byId.set(profile.studentId, profile);
  }

  async search(filters: PublicDirectorySearchFilters): Promise<PublicDirectoryProfile[]> {
    return [...this.byId.values()].filter((p) => {
      if (filters.batchId && p.batchId !== filters.batchId) return false;
      if (filters.skills && !filters.skills.some((s) => p.skills.includes(s))) return false;
      if (filters.software && !filters.software.some((s) => p.software.includes(s))) return false;
      if (filters.query) {
        const needle = filters.query.toLowerCase();
        const haystacks = [p.fullName, p.bio ?? "", ...p.skills, ...p.software];
        if (!haystacks.some((f) => f.toLowerCase().includes(needle))) return false;
      }
      return true;
    });
  }

  async findByStudentId(studentId: string): Promise<PublicDirectoryProfile | null> {
    return this.byId.get(studentId) ?? null;
  }
}
