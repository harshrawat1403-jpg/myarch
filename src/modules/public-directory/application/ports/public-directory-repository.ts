import type { PublicDirectoryProfile, PublicDirectorySearchFilters } from "../../domain/entities";

export interface PublicDirectoryRepository {
  /**
   * Every implementation must guarantee, structurally, that only rows
   * satisfying ALL of: a StudentPublicProfile exists (approved), the
   * student's own isPubliclyDiscoverable is true, the student is active,
   * and the batch is ACTIVE — ever reach the caller. See the Prisma
   * implementation's doc comment for how this is enforced by construction.
   */
  search(filters: PublicDirectorySearchFilters): Promise<PublicDirectoryProfile[]>;
  findByStudentId(studentId: string): Promise<PublicDirectoryProfile | null>;
}
