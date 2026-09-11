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
  PortfolioImage,
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
export { updateProfileVisibilityRouteHandler } from "./presentation/route-handlers/update-profile-visibility";
export { uploadPortfolioImageRouteHandler } from "./presentation/route-handlers/upload-portfolio-image";
export { deletePortfolioImageRouteHandler } from "./presentation/route-handlers/delete-portfolio-image";
export { uploadResumeRouteHandler } from "./presentation/route-handlers/upload-resume";
export { deleteResumeRouteHandler } from "./presentation/route-handlers/delete-resume";
