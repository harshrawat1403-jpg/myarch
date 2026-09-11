import type { CertificationEntry, InternshipEntry, PortfolioImage, ProjectEntry } from "@/modules/profiles";

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
  readonly portfolioImages?: readonly PortfolioImage[];
  readonly certifications: readonly CertificationEntry[];
  readonly internships: readonly InternshipEntry[];
  readonly hasResume: boolean;
  /** V4.0 A5/C1: resolves User.avatarFileId → /api/files/{id}, the same reused avatar mechanism the public directory (B4) uses — null only when the student never uploaded one. */
  readonly profilePhotoUrl: string | null;
  /** V4.0 C1 — private to the requesting recruiter; never visible to the student or any other recruiter (§8). False for an unauthenticated-style default when no interaction row exists yet. */
  readonly isSaved: boolean;
  readonly isShortlisted: boolean;
  /** V4.0 C2 — null when this recruiter has never expressed interest in this student; otherwise the current lifecycle state (§8 step 4 — a second Express Interest attempt just re-shows this, never a new row). */
  readonly interestStatus: RecruiterInterestRequestStatus | null;
}

export type RecruiterInterestRequestStatus = "SENT" | "ACCEPTED" | "DECLINED" | "COMPLETED";

export interface RecruiterInterestRequestRecord {
  readonly id: string;
  readonly recruiterProfileId: string;
  readonly studentProfileId: string;
  readonly message: string | null;
  readonly status: RecruiterInterestRequestStatus;
  readonly sentAt: Date;
  readonly respondedAt: Date | null;
  readonly completedAt: Date | null;
}

/**
 * V4.0 C3 — the student's own view of an interest request. Deliberately
 * NOT RecruiterInterestRequestRecord reused as-is: a student sees the
 * recruiter's company name (for deciding whether to accept), never the
 * recruiter's personal email/phone — symmetric with recruiters never
 * receiving a student's private contact info (§7 step 7's "no direct
 * contact info exchange" — the Secretary is always the intermediary).
 */
export interface StudentInterestDTO {
  readonly id: string;
  readonly companyName: string;
  readonly message: string | null;
  readonly status: RecruiterInterestRequestStatus;
  readonly sentAt: Date;
  readonly respondedAt: Date | null;
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

/**
 * V4.0 C4 — the recruiter-specific counters shown on the new /recruiter
 * dashboard, consolidating C1–C3 data. Deliberately separate from
 * RecruiterDashboardStats above, which is directory-wide (every recruiter
 * sees the same numbers); these are private to the requesting recruiter.
 */
export interface RecruiterOverviewStats {
  readonly companyName: string;
  readonly savedCount: number;
  readonly shortlistedCount: number;
  readonly interestsSentCount: number;
  readonly interestsAcceptedCount: number;
}

/**
 * V4.0 C4 — one row of the recruiter's own /recruiter/interests list. Named
 * distinctly from StudentInterestDTO (the mirror-image view from the
 * student's side): this one carries the student's name/batch for the
 * recruiter's own sent-interests view, never the recruiter's own identity.
 */
export interface RecruiterSentInterestDTO {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly batchName: string;
  readonly message: string | null;
  readonly status: RecruiterInterestRequestStatus;
  readonly sentAt: Date;
  readonly respondedAt: Date | null;
}

export interface ResumeReference {
  readonly storageKey: string;
  readonly mimeType: string;
}

export type RecruiterApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * V3.0 Administration Platform — the Secretary-facing account record
 * (name/email/company/status), deliberately separate from
 * RecruiterStudentProfileDTO above (that one is what a Recruiter sees of a
 * Student; this one is what a Secretary sees of a Recruiter — different
 * audiences, different fields, never reused for each other).
 */
export interface RecruiterAccountRecord {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
  readonly companyName: string;
  readonly isActive: boolean;
  readonly approvalStatus: RecruiterApprovalStatus;
  readonly createdAt: Date;
}

export interface RecruiterAccountSearchFilters {
  readonly name?: string;
  readonly email?: string;
  readonly companyName?: string;
  readonly approvalStatus?: RecruiterApprovalStatus;
  readonly includeInactive?: boolean;
}
