/**
 * Public exports of the announcements module (MYARCH Phase 3, §4.5). Other
 * modules must import only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  AnnouncementAudienceType,
  AnnouncementPriority,
  AnnouncementRecord,
  AnnouncementAttachmentRecord,
  AnnouncementFilters,
  AnnouncementSort,
  AnnouncementSortField,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { isAnnouncementActive, isActorInAudience } from "./domain/entities";
export { AnnouncementNotFoundError, InvalidAnnouncementAttachmentError } from "./domain/errors";
export { canCreateAnnouncement, canManageAnnouncement, canViewAnnouncement } from "./domain/permissions";
export type { AnnouncementDetail } from "./application/use-cases/get-announcement";

export { createAnnouncementRouteHandler } from "./presentation/route-handlers/create";
export { getAnnouncementRouteHandler } from "./presentation/route-handlers/get";
export { updateAnnouncementRouteHandler } from "./presentation/route-handlers/update";
export { deleteAnnouncementRouteHandler } from "./presentation/route-handlers/delete";
export { searchAnnouncementsRouteHandler } from "./presentation/route-handlers/search";
export { addAnnouncementAttachmentRouteHandler } from "./presentation/route-handlers/add-attachment";
export { getAnnouncementAttachmentRouteHandler } from "./presentation/route-handlers/get-attachment";
