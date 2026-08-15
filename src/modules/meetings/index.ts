/**
 * Public exports of the meetings module (MYARCH Phase 3, §4.4). Other
 * modules must import only from here (docs/architecture/07_Repository_Structure.md).
 * Meeting "action items" (§4.4) are plain Task Engine rows and have no
 * surface here — use tasks' own createTaskUseCase/searchTasksUseCase
 * directly with relatedEntityType "Meeting" (see domain/entities.ts's own
 * doc comment).
 */

export type {
  MeetingStatus,
  MeetingRecord,
  MeetingParticipantRecord,
  MeetingFilters,
  MeetingSort,
  MeetingSortField,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { isTerminalMeetingStatus } from "./domain/entities";
export { MeetingNotFoundError, InvalidMeetingTransitionError, DuplicateMeetingParticipantError } from "./domain/errors";
export { canCreateMeeting, canViewMeeting, canManageMeeting } from "./domain/permissions";
export type { MeetingDetail } from "./application/use-cases/get-meeting";

export { createMeetingRouteHandler } from "./presentation/route-handlers/create";
export { getMeetingRouteHandler } from "./presentation/route-handlers/get";
export { updateMeetingRouteHandler } from "./presentation/route-handlers/update";
export { searchMeetingsRouteHandler } from "./presentation/route-handlers/search";
export { completeMeetingRouteHandler } from "./presentation/route-handlers/complete";
export { cancelMeetingRouteHandler } from "./presentation/route-handlers/cancel";
export { addMeetingParticipantRouteHandler } from "./presentation/route-handlers/add-participant";
export { removeMeetingParticipantRouteHandler } from "./presentation/route-handlers/remove-participant";
export { markMeetingAttendanceRouteHandler } from "./presentation/route-handlers/mark-attendance";
