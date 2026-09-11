/**
 * Framework-free Domain layer types for the profiles module — the
 * draft/approval workflow governing StudentPublicProfileDraft and
 * StudentPublicProfile. This is the ONLY module that ever writes to
 * StudentPublicProfile, and it only does so through ApproveDraftUseCase's
 * publish step — see docs/architecture/05_System_Architecture.md's Core
 * Data Flow, which this module implements directly.
 */

/**
 * A strict 4-state machine rather than boolean flags. "Submitted" is
 * deliberately NOT a stored state — it is the transient action that moves a
 * draft from DRAFT or CHANGES_REQUESTED into PENDING_REVIEW (see
 * application/use-cases/submit-draft.ts). This mirrors the frozen Prisma
 * enum exactly (renamed from REJECTED to CHANGES_REQUESTED per the Days 5–6
 * implementation decision — see CHANGELOG.md).
 */
export type ProfileDraftStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "CHANGES_REQUESTED";

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
 * The portfolio-first content shared by both the draft and the published
 * profile. Deliberately contains NOTHING from StudentPrivateFields (CGPA,
 * backlog, contact info, internal remarks) — there is no supertype spanning
 * both, by design, so a private field literally cannot be added here without
 * visibly redefining this type (docs/security/09_User_Roles_and_Permissions.md).
 */
export interface ProfileContent {
  readonly bio: string | null;
  readonly skills: readonly string[];
  readonly software: readonly string[];
  readonly selectedProjects: readonly ProjectEntry[];
  readonly portfolioLinks: readonly string[];
  /** Present only from profile repositories; never accepted from a client save payload. */
  readonly portfolioImages?: readonly PortfolioImage[];
  readonly resumeFileId: string | null;
  readonly certifications: readonly CertificationEntry[];
  readonly internships: readonly InternshipEntry[];
}

export interface ProfileDraft extends ProfileContent {
  readonly id: string;
  readonly studentProfileId: string;
  readonly status: ProfileDraftStatus;
  readonly submittedAt: Date | null;
  readonly reviewedByUserId: string | null;
  readonly reviewedAt: Date | null;
  /** Reviewer's comment when changes are requested. Maps to the Prisma
   * column still named `rejectionReason` (kept as-is — only the enum value
   * itself was approved for renaming, not this field). */
  readonly reviewComment: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Content fields are immutable except through ApproveDraftUseCase's publish
 * step. isPubliclyDiscoverable/showCgpa (V4.0 B4) are the one exception —
 * deliberately NOT part of the draft/approval content-review cycle (they're
 * visibility settings, not profile content), so the student toggles them
 * directly here via UpdateProfileVisibilityUseCase without needing another
 * approval round-trip.
 */
export interface PublishedProfile extends ProfileContent {
  readonly id: string;
  readonly studentProfileId: string;
  readonly publishedFromDraftId: string | null;
  readonly publishedAt: Date;
  readonly publishedByUserId: string;
  readonly isPubliclyDiscoverable: boolean;
  readonly showCgpa: boolean;
}

export interface ApprovalQueueItem {
  readonly draftId: string;
  readonly studentProfileId: string;
  readonly studentFullName: string;
  readonly batchId: string;
  readonly submittedAt: Date | null;
}
