/**
 * Public exports of the Generic Request module (MYARCH Phase 2, §3.7) —
 * built on top of the Task/Follow-up Engine (§3.8). Other modules must
 * import only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  RequestStatus,
  RequestPriority,
  RequestDecision,
  RequestRecord,
  RequestAttachmentRecord,
  RequestFilters,
  RequestSort,
  RequestSortField,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { isRequestOverdue } from "./domain/entities";
export {
  RequestNotFoundError,
  InvalidRequestTransitionError,
  RequestNotApprovedError,
  RequestAlreadyDecidedError,
  InvalidRequestOwnerError,
  InvalidRequestAttachmentError,
} from "./domain/errors";

export { submitRequestRouteHandler } from "./presentation/route-handlers/submit";
export { getRequestRouteHandler } from "./presentation/route-handlers/get";
export { updateRequestRouteHandler } from "./presentation/route-handlers/update";
export { startRequestReviewRouteHandler } from "./presentation/route-handlers/start-review";
export { decideRequestRouteHandler } from "./presentation/route-handlers/decide";
export { assignRequestRouteHandler } from "./presentation/route-handlers/assign";
export { reassignRequestRouteHandler } from "./presentation/route-handlers/reassign";
export { startRequestProgressRouteHandler } from "./presentation/route-handlers/start-progress";
export { completeRequestRouteHandler } from "./presentation/route-handlers/complete";
export { closeRequestRouteHandler } from "./presentation/route-handlers/close";
export { addRequestUpdateRouteHandler } from "./presentation/route-handlers/add-update";
export { addRequestAttachmentRouteHandler } from "./presentation/route-handlers/add-attachment";
export { getRequestAttachmentRouteHandler } from "./presentation/route-handlers/get-attachment";
export { getRequestHistoryRouteHandler } from "./presentation/route-handlers/history";
export { searchRequestsRouteHandler } from "./presentation/route-handlers/search";
