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
  RecruiterInterestRequestStatus,
  RecruiterInterestRequestRecord,
  StudentInterestDTO,
  RecruiterOverviewStats,
  RecruiterSentInterestDTO,
} from "./domain/entities";
export {
  ApprovedProfileNotFoundError,
  ResumeNotAvailableError,
  RecruiterAccountNotFoundError,
  DuplicateEmailError,
  RecruiterAlreadyActiveError,
  RecruiterAlreadyDisabledError,
  RecruiterNotPendingError,
  RecruiterProfileNotFoundError,
  StudentNotSavedError,
  InterestRequestNotFoundError,
  InterestRequestAlreadyRespondedError,
} from "./domain/errors";

export { searchDirectoryRouteHandler } from "./presentation/route-handlers/search";
export { getRecruiterProfileRouteHandler } from "./presentation/route-handlers/get-profile";
export { recruiterDashboardStatsRouteHandler } from "./presentation/route-handlers/dashboard-stats";
export { getRecruiterResumeRouteHandler } from "./presentation/route-handlers/get-resume";
export { setSavedStudentRouteHandler } from "./presentation/route-handlers/set-saved";
export { setShortlistedStudentRouteHandler } from "./presentation/route-handlers/set-shortlisted";
export { expressInterestRouteHandler } from "./presentation/route-handlers/express-interest";
export { listStudentInterestsRouteHandler } from "./presentation/route-handlers/student/list-interests";
export { respondToInterestRouteHandler } from "./presentation/route-handlers/student/respond-to-interest";
export { listSavedStudentsRouteHandler } from "./presentation/route-handlers/list-saved";
export { listSentInterestsRouteHandler } from "./presentation/route-handlers/list-interests";
export { getRecruiterOverviewRouteHandler } from "./presentation/route-handlers/overview";

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

// MYARCH Phase 1 (§2.4) — public self-signup.
export { signupRecruiterRouteHandler } from "./presentation/route-handlers/signup";
export { bulkSetRecruitersActiveRouteHandler } from "./presentation/route-handlers/admin/bulk-set-active";
export { getRecruiterActivityRouteHandler } from "./presentation/route-handlers/admin/activity";
