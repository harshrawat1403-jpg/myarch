/**
 * Framework-free Domain layer types for Events (MYARCH Phase 3, §4.2/§4.3).
 * "Tasks" (§4.3) are deliberately NOT modeled here — an event task IS a
 * plain Task Engine row (relatedEntityType "Event", relatedEntityId
 * event.id), created/queried directly against Task Engine's own existing
 * `/api/tasks` endpoints (createTaskUseCase/searchTasksUseCase already
 * support this — see tasks/index.ts's own doc comment). Unlike Maintenance/
 * Requests' one-canonical-task-per-entity, system-driven, status-synced
 * shape (which needed the task-engine-bridge elevation pattern), an event
 * can have many ad-hoc, human-created tasks — there is nothing for this
 * module to own or bridge.
 */

export type EventStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
export type EventParticipantRole = "ORGANIZER" | "COORDINATOR" | "VOLUNTEER";
export type EventAttachmentKind = "DOCUMENT" | "MEDIA";

export interface EventRecord {
  readonly id: string;
  readonly title: string;
  readonly slug?: string;
  readonly description: string | null;
  readonly shortDescription?: string | null;
  readonly category?: string | null;
  readonly isPublic?: boolean;
  readonly featured?: boolean;
  readonly coverImageFileId?: string | null;
  readonly startAt: Date;
  readonly endAt: Date | null;
  readonly venue: string | null;
  readonly status: EventStatus;

  readonly organizerId: string;

  readonly budgetAmount: string | null;
  readonly budgetNotes: string | null;
  readonly postEventReport: string | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface EventParticipantRecord {
  readonly id: string;
  readonly eventId: string;
  readonly userId: string;
  readonly role: EventParticipantRole;
  readonly createdAt: Date;
}

export interface EventChecklistItemRecord {
  readonly id: string;
  readonly eventId: string;
  readonly label: string;
  readonly isDone: boolean;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface EventAttachmentRecord {
  readonly id: string;
  readonly eventId: string;
  readonly fileId: string;
  readonly kind: EventAttachmentKind;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

export interface EventRegistrationRecord {
  readonly id: string;
  readonly eventId: string;
  readonly userId: string;
  readonly registeredAt: Date;
  readonly attendedAt: Date | null;
}

export interface EventFilters {
  readonly status?: EventStatus;
  readonly organizerId?: string;
  readonly search?: string;
  readonly startAtFrom?: Date;
  readonly startAtTo?: Date;
  /** organizerId = X OR status != DRAFT — the visibility scoping SearchEventsUseCase forces for anyone without events.view/events.manage, mirroring tasks' own involvingUserId shape. */
  readonly ownOrPublishedOnly?: string;
}

export type EventSortField = "startAt" | "createdAt";

export interface EventSort {
  readonly field: EventSortField;
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

export const EVENT_TITLE_MAX_LENGTH = 200;
export const EVENT_DESCRIPTION_MAX_LENGTH = 5000;
export const EVENT_VENUE_MAX_LENGTH = 200;
export const EVENT_REPORT_MAX_LENGTH = 10000;
export const EVENT_BUDGET_NOTES_MAX_LENGTH = 2000;
export const EVENT_CHECKLIST_LABEL_MAX_LENGTH = 300;

const TERMINAL_EVENT_STATUSES: readonly EventStatus[] = ["COMPLETED", "CANCELLED"];

export function isTerminalEventStatus(status: EventStatus): boolean {
  return TERMINAL_EVENT_STATUSES.includes(status);
}

/** Registration/attendance only make sense while the event is live and upcoming. */
export function isEventRegistrationOpen(status: EventStatus): boolean {
  return status === "PUBLISHED";
}
