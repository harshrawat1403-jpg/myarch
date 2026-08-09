/**
 * Framework-free Domain layer types for the placements module (V4.0 D1).
 * Internships are a `PlacementDriveType` variant of PlacementDrive, never a
 * parallel entity tree (§0, §5.1, §11 of docs/planning/V4_0_PRD.md —
 * "data entered once, reused everywhere").
 */

export type PlacementDriveType = "PLACEMENT" | "INTERNSHIP";
export type PlacementDriveStatus = "DRAFT" | "ANNOUNCED" | "IN_PROGRESS" | "CLOSED";

export type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "ACCEPTED"
  | "ACTIVE"
  | "COMPLETED"
  | "WITHDRAWN";

/** Terminal states an Application can never transition out of. */
export const TERMINAL_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "REJECTED",
  "COMPLETED",
  "WITHDRAWN",
];

/** V4.0 D3 (§18) — "simple date/time/mode fields on Application, no calendar-sync integration." */
export type InterviewMode = "ONLINE" | "IN_PERSON" | "PHONE";

/**
 * V4.0 D4 (§5.1) — "the internship-specific tail end of the lifecycle, kept
 * OFF Application itself." Only ever exists once an Application on an
 * INTERNSHIP drive reaches ACTIVE — created automatically at that point by
 * UpdateApplicationStatusUseCase, never by a separate manual step.
 */
export interface InternshipOutcomeRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly certificateFileId: string | null;
  readonly companyFeedback: string | null;
  readonly studentFeedback: string | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DriveEligibility {
  readonly minCgpa?: number;
  /** true = students with an active backlog may still apply. Omitted/undefined is treated as allowed (no restriction). */
  readonly backlogAllowance?: boolean;
  readonly eligibleBatchIds: readonly string[];
}

export interface PlacementDriveRecord {
  readonly id: string;
  readonly companyId: string;
  readonly companyName: string;
  readonly title: string;
  readonly type: PlacementDriveType;
  readonly eligibility: DriveEligibility;
  readonly packageOrStipend: string | null;
  readonly description: string | null;
  readonly status: PlacementDriveStatus;
  readonly applicationDeadline: Date | null;
  readonly createdByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PlacementDriveSearchFilters {
  readonly status?: PlacementDriveStatus;
  readonly type?: PlacementDriveType;
  readonly companyId?: string;
}

export interface CreatePlacementDriveData {
  readonly companyId: string;
  readonly title: string;
  readonly type: PlacementDriveType;
  readonly eligibility: DriveEligibility;
  readonly packageOrStipend?: string | null;
  readonly description?: string | null;
  readonly applicationDeadline?: Date | null;
  readonly createdByUserId: string;
}

export interface UpdatePlacementDriveData {
  readonly title?: string;
  readonly eligibility?: DriveEligibility;
  readonly packageOrStipend?: string | null;
  readonly description?: string | null;
  readonly applicationDeadline?: Date | null;
}

export interface ApplicationRecord {
  readonly id: string;
  readonly studentProfileId: string;
  readonly placementDriveId: string;
  readonly currentStatus: ApplicationStatus;
  readonly currentRound: number | null;
  readonly interviewScheduledAt: Date | null;
  readonly interviewMode: InterviewMode | null;
  readonly appliedAt: Date;
  readonly updatedAt: Date;
}

export interface ApplicationStatusEventRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly fromStatus: ApplicationStatus | null;
  readonly toStatus: ApplicationStatus;
  readonly note: string | null;
  readonly changedByUserId: string;
  readonly occurredAt: Date;
}

/** The student's own view of an open drive on their career hub — never exposes other students' application data. */
export interface StudentDriveDTO {
  readonly driveId: string;
  readonly companyName: string;
  readonly title: string;
  readonly type: PlacementDriveType;
  readonly packageOrStipend: string | null;
  readonly description: string | null;
  readonly applicationDeadline: Date | null;
  readonly hasApplied: boolean;
  readonly applicationStatus: ApplicationStatus | null;
}

/** The student's own view of one of their applications, joined with the drive's display fields. */
export interface StudentApplicationDTO {
  readonly applicationId: string;
  readonly driveId: string;
  readonly companyName: string;
  readonly title: string;
  readonly type: PlacementDriveType;
  readonly currentStatus: ApplicationStatus;
  readonly interviewScheduledAt: Date | null;
  readonly interviewMode: InterviewMode | null;
  readonly appliedAt: Date;
}

/** V4.0 D3 (§14) — one row of the Secretary/Coordinator application board for a single drive, joined with the applying student's display fields. */
export interface DriveApplicationDTO {
  readonly applicationId: string;
  readonly studentProfileId: string;
  readonly studentName: string;
  readonly batchName: string;
  readonly currentStatus: ApplicationStatus;
  readonly currentRound: number | null;
  readonly interviewScheduledAt: Date | null;
  readonly interviewMode: InterviewMode | null;
  readonly appliedAt: Date;
}
