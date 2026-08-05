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
} from "./domain/entities";
export { ApprovedProfileNotFoundError, ResumeNotAvailableError } from "./domain/errors";

export { searchDirectoryRouteHandler } from "./presentation/route-handlers/search";
export { getRecruiterProfileRouteHandler } from "./presentation/route-handlers/get-profile";
export { recruiterDashboardStatsRouteHandler } from "./presentation/route-handlers/dashboard-stats";
export { getRecruiterResumeRouteHandler } from "./presentation/route-handlers/get-resume";
