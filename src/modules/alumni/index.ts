/**
 * Public exports of the alumni module (V4.0 D5). Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type { AlumniRecord, AlumniSearchFilters, AlumniApprovalStatus } from "./domain/entities";
export {
  AlumniNotFoundError,
  StudentProfileNotFoundError,
  DuplicateAlumniLinkError,
  DuplicateEmailError,
  AlumniNotPendingError,
} from "./domain/errors";

export { createAlumniRouteHandler } from "./presentation/route-handlers/create";
export { updateAlumniRouteHandler } from "./presentation/route-handlers/update";
export { deleteAlumniRouteHandler } from "./presentation/route-handlers/delete";
export { searchAlumniRouteHandler } from "./presentation/route-handlers/search";
export { getAlumniRouteHandler } from "./presentation/route-handlers/get";

// MYARCH Phase 1 (§2.4) — public self-signup + admin approve/reject.
export { signupAlumniRouteHandler } from "./presentation/route-handlers/signup";
export {
  approveAlumniRouteHandler,
  rejectAlumniRouteHandler,
} from "./presentation/route-handlers/admin/approve-reject";
