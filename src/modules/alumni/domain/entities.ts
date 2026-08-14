/**
 * Framework-free Domain layer types for the alumni module (V4.0 D5). The
 * one entity in this PRD where Secretary and Coordinator have byte-for-byte
 * identical CRUD authority (§4's permission matrix — "Manage alumni
 * records: Coordinator Full (operational), Secretary Full"), so this
 * module's permission surface is deliberately a single function, not a
 * manage/decide split.
 */

/**
 * MYARCH Phase 1 (§2.4) — value-identical to recruiters' RecruiterApprovalStatus
 * (the schema column itself reuses that same Prisma enum — see
 * AlumniProfile.approvalStatus's own doc comment) but declared separately
 * here, matching this module's existing isolation convention (see
 * domain/errors.ts's own doc comment: "isolated... including its error
 * vocabulary").
 */
export type AlumniApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AlumniRecord {
  readonly id: string;
  readonly studentProfileId: string | null;
  /** MYARCH Phase 1 — null for pre-existing directory-only rows with no login account (see AlumniProfile.userId's own doc comment). */
  readonly userId: string | null;
  readonly fullName: string;
  readonly graduationYear: number;
  readonly currentCompany: string | null;
  readonly designation: string | null;
  readonly location: string | null;
  readonly portfolioUrl: string | null;
  readonly linkedInUrl: string | null;
  readonly mentorshipAvailable: boolean;
  /** MYARCH Phase 1 — defaults APPROVED for admin-created rows; only self-signup ever produces PENDING. */
  readonly approvalStatus: AlumniApprovalStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AlumniSearchFilters {
  readonly name?: string;
  readonly graduationYear?: number;
  readonly mentorshipAvailable?: boolean;
  readonly approvalStatus?: AlumniApprovalStatus;
}
