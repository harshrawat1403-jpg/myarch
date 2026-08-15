/**
 * Framework-free Domain layer types for Meetings (MYARCH Phase 3, §4.4).
 * "Action items" (§4.4's own explicit instruction: "must use the shared
 * task/follow-up system") are NOT modeled here — a meeting action item IS a
 * plain Task Engine row (relatedEntityType "Meeting", relatedEntityId
 * meeting.id), created/queried directly against Task Engine's own existing
 * `/api/tasks` endpoints. See events/domain/entities.ts's identical
 * reasoning for its own "tasks" feature.
 */

export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface MeetingRecord {
  readonly id: string;
  readonly title: string;
  readonly agenda: string | null;
  readonly startAt: Date;
  readonly venueOrLink: string | null;
  readonly status: MeetingStatus;

  readonly organizerId: string;

  readonly notes: string | null;
  readonly decisions: string | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MeetingParticipantRecord {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly attended: boolean;
  readonly createdAt: Date;
}

export interface MeetingFilters {
  readonly status?: MeetingStatus;
  readonly organizerId?: string;
  readonly search?: string;
  readonly startAtFrom?: Date;
  readonly startAtTo?: Date;
  /** organizerId = X OR participants contains X — the visibility scoping SearchMeetingsUseCase forces for anyone without meetings.manage, mirroring tasks' own involvingUserId shape. */
  readonly involvingUserId?: string;
}

export type MeetingSortField = "startAt" | "createdAt";

export interface MeetingSort {
  readonly field: MeetingSortField;
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

export const MEETING_TITLE_MAX_LENGTH = 200;
export const MEETING_AGENDA_MAX_LENGTH = 5000;
export const MEETING_VENUE_OR_LINK_MAX_LENGTH = 300;
export const MEETING_NOTES_MAX_LENGTH = 10000;
export const MEETING_DECISIONS_MAX_LENGTH = 10000;

const TERMINAL_MEETING_STATUSES: readonly MeetingStatus[] = ["COMPLETED", "CANCELLED"];

export function isTerminalMeetingStatus(status: MeetingStatus): boolean {
  return TERMINAL_MEETING_STATUSES.includes(status);
}
