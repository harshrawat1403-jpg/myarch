/**
 * Public exports of the events module (MYARCH Phase 3, §4.2/§4.3). Other
 * modules must import only from here (docs/architecture/07_Repository_Structure.md).
 * Event "tasks" (§4.3) are plain Task Engine rows and have no surface here —
 * use tasks' own createTaskUseCase/searchTasksUseCase directly with
 * relatedEntityType "Event" (see domain/entities.ts's own doc comment).
 */

export type {
  EventStatus,
  EventParticipantRole,
  EventAttachmentKind,
  EventRecord,
  EventParticipantRecord,
  EventChecklistItemRecord,
  EventAttachmentRecord,
  EventRegistrationRecord,
  EventFilters,
  EventSort,
  EventSortField,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { isTerminalEventStatus, isEventRegistrationOpen } from "./domain/entities";
export {
  EventNotFoundError,
  InvalidEventTransitionError,
  InvalidEventAttachmentError,
  EventNotRegistrableError,
  AlreadyRegisteredForEventError,
  NotRegisteredForEventError,
  DuplicateEventParticipantError,
} from "./domain/errors";
export { canCreateEvent, canViewEvent, canManageEvent, canRegisterForEvent } from "./domain/permissions";
export type { EventDetail } from "./application/use-cases/get-event";

export { createEventRouteHandler } from "./presentation/route-handlers/create";
export { getEventRouteHandler } from "./presentation/route-handlers/get";
export { updateEventRouteHandler } from "./presentation/route-handlers/update";
export { searchEventsRouteHandler } from "./presentation/route-handlers/search";
export { publishEventRouteHandler } from "./presentation/route-handlers/publish";
export { completeEventRouteHandler } from "./presentation/route-handlers/complete";
export { cancelEventRouteHandler } from "./presentation/route-handlers/cancel";
export { addEventParticipantRouteHandler } from "./presentation/route-handlers/add-participant";
export { removeEventParticipantRouteHandler } from "./presentation/route-handlers/remove-participant";
export { addEventChecklistItemRouteHandler } from "./presentation/route-handlers/add-checklist-item";
export { toggleEventChecklistItemRouteHandler } from "./presentation/route-handlers/toggle-checklist-item";
export { removeEventChecklistItemRouteHandler } from "./presentation/route-handlers/remove-checklist-item";
export { addEventAttachmentRouteHandler } from "./presentation/route-handlers/add-attachment";
export { getEventAttachmentRouteHandler } from "./presentation/route-handlers/get-attachment";
export { registerForEventRouteHandler } from "./presentation/route-handlers/register";
export { markEventAttendanceRouteHandler } from "./presentation/route-handlers/mark-attendance";
