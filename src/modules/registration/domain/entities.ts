/**
 * Framework-free Domain layer types for the registration module (V4.0 B1) —
 * the public, unauthenticated entry point (docs/planning/V4_0_PRD.md §7
 * step 2). No account exists until a Secretary approves this (B3).
 */

export type RegistrationRequestStatus = "SUBMITTED" | "REVIEWED" | "NEEDS_ATTENTION" | "APPROVED" | "REJECTED";

/** Self-reported fields, kept separate from StudentPrivateProfile until approval — see the schema's own doc comment. */
export interface RegistrationSubmittedData {
  readonly phone?: string;
  readonly personalEmail?: string;
  readonly notes?: string;
}

export interface RegistrationRequestRecord {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly rollNumber: string;
  readonly batchId: string;
  readonly submittedData: RegistrationSubmittedData;
  readonly status: RegistrationRequestStatus;
  /** MYARCH Phase 1 (§2.4) — null until the applicant verifies their email. DecideRegistrationRequestUseCase refuses to APPROVE while this is null. */
  readonly emailVerifiedAt: Date | null;
  readonly coordinatorComment: string | null;
  readonly reviewedByUserId: string | null;
  readonly reviewedAt: Date | null;
  readonly decidedByUserId: string | null;
  readonly decidedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly resultingStudentProfileId: string | null;
  readonly credentialsEmailSent?: boolean | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PublicRegistrationVerificationStatus {
  readonly status: RegistrationRequestStatus;
  readonly accountExists: boolean;
  readonly credentialsEmailSent: boolean | null;
}

export interface RegistrationRequestSearchFilters {
  readonly status?: RegistrationRequestStatus;
  readonly batchId?: string;
  /** Actor-derived scoping (Coordinator's batchScope) — an allow-list, distinct from the single admin-chosen `batchId` filter above. Omitted entirely for an unscoped Secretary. */
  readonly batchIds?: readonly string[];
}
