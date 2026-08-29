/**
 * Public exports of the committees module (MYARCH Phase 4, §5). Other
 * modules must import only from here (docs/architecture/07_Repository_Structure.md).
 * Committee "action items" are plain Task Engine rows (relatedEntityType
 * "Committee") and "meetings" are plain Meeting rows (Meeting.committeeId) —
 * neither has a surface here; use tasks'/meetings' own barrels directly.
 */

export type {
  CommitteeType,
  CommitteeStatus,
  CommitteeRecord,
  CommitteeMembershipRecord,
  CommitteeAttachmentRecord,
  CommitteeFilters,
  CommitteeSort,
  CommitteeSortField,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { isCommitteeMember, isCommitteeLead } from "./domain/entities";
export {
  CommitteeNotFoundError,
  CommitteeMembershipNotFoundError,
  DuplicateCommitteeMembershipError,
  InvalidCommitteeAttachmentError,
} from "./domain/errors";
export { canCreateCommittee, canManageCommittee, canViewCommittee } from "./domain/permissions";
export type { CommitteeDetail } from "./application/use-cases/get-committee";

export { createCommitteeRouteHandler } from "./presentation/route-handlers/create";
export { getCommitteeRouteHandler } from "./presentation/route-handlers/get";
export { getCommitteeHistoryRouteHandler } from "./presentation/route-handlers/history";
export { updateCommitteeRouteHandler } from "./presentation/route-handlers/update";
export { archiveCommitteeRouteHandler } from "./presentation/route-handlers/archive";
export { searchCommitteesRouteHandler } from "./presentation/route-handlers/search";
export { addCommitteeMemberRouteHandler } from "./presentation/route-handlers/add-member";
export { updateCommitteeMemberRouteHandler } from "./presentation/route-handlers/update-member";
export { endCommitteeMembershipRouteHandler } from "./presentation/route-handlers/end-membership";
export { addCommitteeAttachmentRouteHandler } from "./presentation/route-handlers/add-attachment";
export { getCommitteeAttachmentRouteHandler } from "./presentation/route-handlers/get-attachment";
