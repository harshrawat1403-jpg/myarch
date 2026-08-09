import type { PlacementDriveStatus } from "@/modules/placements";
import type { CompanySearchResult, PublicationSearchResult, StudentSearchResult } from "../../domain/entities";

/** A drive row before role/eligibility filtering — carries eligibleBatchIds/applicationDeadline so the use case can apply the exact same visibility rules SearchPlacementDrivesUseCase/ListOpenDrivesForStudentUseCase already establish, without re-deriving them in SQL. */
export interface DriveSearchRow {
  readonly id: string;
  readonly title: string;
  readonly status: PlacementDriveStatus;
  readonly companyName: string;
  readonly eligibleBatchIds: readonly string[];
  readonly applicationDeadline: Date | null;
}

/**
 * V4.0 E6 (PRD §15) — the one cross-entity search port, direct-Prisma
 * (raw SQL, tsvector `@@` queries) rather than reusing each feature
 * module's own Application layer — the same "one cohesive port, direct
 * access, no cross-module Application-layer reuse" shape already
 * established by PublicationDataLookup for the same reason: this is
 * fundamentally a cross-cutting read, not a write path, and importing
 * four different modules' use cases here would mean re-deriving their
 * output shapes anyway while adding four unnecessary layers of
 * indirection for a single bounded read.
 */
export interface GlobalSearchRepository {
  /**
   * Staff-facing (Secretary/Coordinator): rooted at student_profiles
   * directly, includes rollNumber, optionally batch-scoped.
   */
  searchStudentsForStaff(query: string, opts: { batchIds?: readonly string[]; limit: number }): Promise<StudentSearchResult[]>;

  /**
   * Recruiter-facing: rooted at student_public_profiles (mirrors
   * PrismaRecruiterDirectoryRepository's own "the only table any
   * Recruiter-facing query is permitted to read from" rule exactly) —
   * active students in active batches only, no rollNumber.
   */
  searchStudentsForRecruiter(query: string, limit: number): Promise<StudentSearchResult[]>;

  /** Secretary/Coordinator only (canViewCompanies). */
  searchCompanies(query: string, limit: number): Promise<CompanySearchResult[]>;

  /** Unfiltered by status/eligibility — the use case applies staff vs. student visibility rules over these rows. */
  searchDrives(query: string, limit: number): Promise<DriveSearchRow[]>;

  /** Secretary/Coordinator only (canManagePublications) — all statuses, matching Publication Studio's own "full authority regardless of DRAFT/PUBLISHED/ARCHIVED" access model. */
  searchPublications(query: string, limit: number): Promise<PublicationSearchResult[]>;

  /** Backs the student-facing drive search's own batch-eligibility filter (mirrors ListOpenDrivesForStudentUseCase's StudentEligibilityLookup use). */
  findStudentBatchId(studentProfileId: string): Promise<string | null>;
}
