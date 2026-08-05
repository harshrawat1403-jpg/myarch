/**
 * Public exports of the profiles module. Other modules must import only
 * from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  ProfileDraftStatus,
  ProfileContent,
  ProfileDraft,
  PublishedProfile,
  ApprovalQueueItem,
  ProjectEntry,
  CertificationEntry,
  InternshipEntry,
} from "./domain/entities";
export {
  DraftNotFoundError,
  PublishedProfileNotFoundError,
  DraftLockedForReviewError,
  InvalidDraftTransitionError,
  MissingReviewCommentError,
} from "./domain/errors";

export { saveDraftRouteHandler } from "./presentation/route-handlers/save-draft";
export { submitDraftRouteHandler } from "./presentation/route-handlers/submit-draft";
export { getDraftRouteHandler } from "./presentation/route-handlers/get-draft";
export { approveDraftRouteHandler } from "./presentation/route-handlers/approve-draft";
export { requestChangesRouteHandler } from "./presentation/route-handlers/request-changes";
export { approvalQueueRouteHandler } from "./presentation/route-handlers/approval-queue";
export { getPublishedProfileRouteHandler } from "./presentation/route-handlers/get-published-profile";
