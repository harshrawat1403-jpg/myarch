/**
 * Public exports of the recruiters module. Other modules must import only
 * from here (docs/architecture/07_Repository_Structure.md). This module is
 * additionally isolated in a stronger sense than the module-boundary rule
 * alone: it imports nothing from students/, batches/, or profiles/ except
 * type-only shape reuse (see domain/entities.ts) — no repository, use
 * case, or route handler here ever calls into the admin-facing modules.
 */

export type {
  RecruiterStudentProfileDTO,
  RecruiterSearchFilters,
  RecruiterDashboardStats,
  ResumeReference,
  RecruiterAccountRecord,
  RecruiterAccountSearchFilters,
  RecruiterApprovalStatus,
} from "./domain/entities";
export {
  ApprovedProfileNotFoundError,
  ResumeNotAvailableError,
  RecruiterAccountNotFoundError,
  DuplicateEmailError,
  RecruiterAlreadyActiveError,
  RecruiterAlreadyDisabledError,
  RecruiterNotPendingError,
} from "./domain/errors";

export { searchDirectoryRouteHandler } from "./presentation/route-handlers/search";
export { getRecruiterProfileRouteHandler } from "./presentation/route-handlers/get-profile";
export { recruiterDashboardStatsRouteHandler } from "./presentation/route-handlers/dashboard-stats";
export { getRecruiterResumeRouteHandler } from "./presentation/route-handlers/get-resume";

// V3.0 Administration Platform — admin-side recruiter account management.
export { createRecruiterAccountRouteHandler } from "./presentation/route-handlers/admin/create";
export { getRecruiterAccountRouteHandler } from "./presentation/route-handlers/admin/get";
export { updateRecruiterAccountRouteHandler } from "./presentation/route-handlers/admin/update";
export { searchRecruiterAccountsRouteHandler } from "./presentation/route-handlers/admin/search";
export {
  disableRecruiterRouteHandler,
  enableRecruiterRouteHandler,
} from "./presentation/route-handlers/admin/set-active";
export {
  approveRecruiterRouteHandler,
  rejectRecruiterRouteHandler,
} from "./presentation/route-handlers/admin/approve-reject";
export { resetRecruiterPasswordRouteHandler } from "./presentation/route-handlers/admin/reset-password";
export { bulkSetRecruitersActiveRouteHandler } from "./presentation/route-handlers/admin/bulk-set-active";
export { getRecruiterActivityRouteHandler } from "./presentation/route-handlers/admin/activity";
