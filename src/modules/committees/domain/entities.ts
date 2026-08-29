/**
 * Framework-free Domain layer types for Council & Committees (MYARCH Phase 4,
 * §5). One unified model covers every named group (Student Council, Core
 * Committee, Event/Technical committees, project teams, temporary
 * committees) — they share an identical attribute shape per §5's own spec.
 *
 * "Projects" and "documents" as full subsystems are explicitly out of scope
 * here — the roadmap assigns full Project management and a generic
 * versioned Resource/Document system to Phase 7 (§8.1). A committee's
 * "responsibilities" is a free-text field on CommitteeRecord; "documents"
 * reuses the existing flat FileAsset attachment pattern (CommitteeAttachmentRecord).
 *
 * "Action items" are NOT modeled here — reuse the Task Engine directly
 * (relatedEntityType "Committee"), same zero-bridge pattern Events/Meetings
 * use. "Meetings" are NOT modeled here either — reuse the Meetings module's
 * own Meeting rows via the new Meeting.committeeId link.
 */

export type CommitteeType =
  | "STUDENT_COUNCIL"
  | "CORE_COMMITTEE"
  | "EVENT_COMMITTEE"
  | "TECHNICAL_COMMITTEE"
  | "PROJECT_TEAM"
  | "TEMPORARY_COMMITTEE";

export type CommitteeStatus = "ACTIVE" | "ARCHIVED";

export interface CommitteeRecord {
  readonly id: string;
  readonly name: string;
  readonly type: CommitteeType;
  readonly status: CommitteeStatus;
  readonly academicYear: string | null;
  readonly responsibilities: string | null;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CommitteeMembershipRecord {
  readonly id: string;
  readonly committeeId: string;
  readonly userId: string;
  readonly position: string | null;
  readonly isLead: boolean;
  readonly academicYear: string | null;
  readonly isActive: boolean;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly createdAt: Date;
}

export interface CommitteeAttachmentRecord {
  readonly id: string;
  readonly committeeId: string;
  readonly fileId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

export interface CommitteeFilters {
  readonly type?: CommitteeType;
  readonly status?: CommitteeStatus;
  readonly academicYear?: string;
  readonly search?: string;
  /** Restricts to committees this specific user currently belongs to — used the same way MeetingFilters.involvingUserId scopes an unprivileged actor's search. */
  readonly involvingUserId?: string;
}

export type CommitteeSortField = "name" | "createdAt";

export interface CommitteeSort {
  readonly field: CommitteeSortField;
  readonly direction: "asc" | "desc";
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const COMMITTEE_NAME_MAX_LENGTH = 200;
export const COMMITTEE_RESPONSIBILITIES_MAX_LENGTH = 5000;
export const COMMITTEE_ACADEMIC_YEAR_MAX_LENGTH = 20;
export const COMMITTEE_POSITION_MAX_LENGTH = 100;

/** Pure — no DB round trip. Active memberships only; a former member is not a current member. */
export function isCommitteeMember(
  userId: string,
  memberships: readonly Pick<CommitteeMembershipRecord, "userId" | "isActive">[],
): boolean {
  return memberships.some((m) => m.userId === userId && m.isActive);
}

/** Pure — no DB round trip. A lead is always also a member; this is the narrower check used for management rights. */
export function isCommitteeLead(
  userId: string,
  memberships: readonly Pick<CommitteeMembershipRecord, "userId" | "isActive" | "isLead">[],
): boolean {
  return memberships.some((m) => m.userId === userId && m.isActive && m.isLead);
}
