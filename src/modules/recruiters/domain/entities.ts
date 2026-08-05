import type { CertificationEntry, InternshipEntry, ProjectEntry } from "@/modules/profiles";

/**
 * Recruiter-facing DTO — deliberately NOT the Prisma StudentPublicProfile
 * model, and NOT a re-export of the profiles module's PublishedProfile type
 * (see docs/planning's Days 8–9 "PUBLIC DTO" requirement). Every field here
 * is an explicit, hand-picked mapping in
 * infrastructure/prisma-recruiter-directory-repository.ts's `toDTO()` —
 * never a spread of an ORM row. Adding a new column to
 * StudentPublicProfile in a future migration does NOT make it appear here;
 * a developer must deliberately add a field to both this type and the
 * mapper for it to ever reach a recruiter. This is the structural
 * enforcement of "future additions to StudentPublicProfile must never
 * automatically appear in recruiter responses."
 *
 * Reuses ProjectEntry/CertificationEntry/InternshipEntry's TYPE shapes from
 * the profiles module (a type-only import, erased at compile time — no
 * runtime dependency on that module's repositories or use cases, so this
 * does not compromise this module's isolation from the admin system).
 */
export interface RecruiterStudentProfileDTO {
  readonly studentId: string;
  readonly fullName: string;
  readonly batchId: string;
  readonly batchName: string;
  readonly bio: string | null;
  readonly skills: readonly string[];
  readonly software: readonly string[];
  readonly selectedProjects: readonly ProjectEntry[];
  readonly portfolioLinks: readonly string[];
  readonly certifications: readonly CertificationEntry[];
  readonly internships: readonly InternshipEntry[];
  readonly hasResume: boolean;
  /**
   * No photo field exists anywhere in the frozen schema
   * (docs/database/08_Database_Design.md's StudentPublicProfile has no
   * image/photo column) — always null today. Present on the DTO now so the
   * card UI has a stable field to render a placeholder against, and so a
   * future schema addition has an obvious, single place to wire through
   * rather than inventing the DTO field at that time under time pressure.
   */
  readonly profilePhotoUrl: string | null;
}

export interface RecruiterSearchFilters {
  /** Free-text search bar — matched against name, skills, software, certifications, and internships. */
  readonly query?: string;
  readonly batchId?: string;
  readonly skills?: readonly string[];
  readonly software?: readonly string[];
  readonly internshipKeyword?: string;
  readonly certificationKeyword?: string;
  readonly hasInternshipExperience?: boolean;
  readonly hasCertification?: boolean;
}

export interface RecruiterDashboardStats {
  readonly totalAvailableStudents: number;
  readonly graduationBatchesAvailable: number;
  readonly skillsRepresented: number;
}

export interface ResumeReference {
  readonly storageKey: string;
  readonly mimeType: string;
}
