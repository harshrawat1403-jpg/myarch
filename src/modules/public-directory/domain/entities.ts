/**
 * Framework-free Domain layer types for the public directory module (V4.0
 * B4) — the unauthenticated /directory surface (docs/planning/V4_0_PRD.md
 * §7 step 1). Deliberately its own module, not an extension of `profiles`
 * or `recruiters`: this is the one surface with no `AuthenticatedActor` at
 * all, and its DTO has an even narrower whitelist (no contact info, no
 * private fields ever, CGPA only when the student opts in).
 */

export interface ProjectEntry {
  readonly title: string;
  readonly description?: string;
  readonly images?: readonly string[];
  readonly semester?: string;
}

export interface PortfolioImage {
  readonly id: string;
  readonly fileId: string;
  readonly title: string | null;
  readonly caption: string | null;
  readonly sortOrder: number;
}

export interface CertificationEntry {
  readonly title: string;
  readonly issuer?: string;
  readonly year?: number;
}

export interface InternshipEntry {
  readonly company: string;
  readonly role?: string;
  readonly duration?: string;
}

/**
 * Every field here is deliberate and public-safe. No email, no phone, no
 * roll number, no internal remarks — see toDTO()'s doc comment in the
 * Prisma repository for the one place a new column must be deliberately
 * added to ever reach this shape.
 */
export interface PublicDirectoryProfile {
  readonly studentId: string;
  readonly fullName: string;
  readonly batchId: string;
  readonly batchName: string;
  readonly bio: string | null;
  readonly skills: readonly string[];
  readonly software: readonly string[];
  readonly selectedProjects: readonly ProjectEntry[];
  readonly portfolioLinks: readonly string[];
  readonly portfolioImages?: readonly PortfolioImage[];
  readonly certifications: readonly CertificationEntry[];
  readonly internships: readonly InternshipEntry[];
  readonly hasResume: boolean;
  readonly profilePhotoUrl: string | null;
  /** Only ever non-null when the student's own showCgpa flag is true — enforced server-side in the repository, never a client-supplied parameter (§18.2). */
  readonly cgpa: number | null;
}

export interface PublicDirectorySearchFilters {
  readonly batchId?: string;
  readonly skills?: readonly string[];
  readonly software?: readonly string[];
  readonly query?: string;
}
