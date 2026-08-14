/**
 * Public exports of the maintenance module (MYARCH Phase 2, §3.1–§3.6, §3.9)
 * — built on top of the Task/Follow-up Engine (§3.8). Other modules must
 * import only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  MaintenanceCategory,
  MaintenanceIssueStatus,
  MaintenancePriority,
  MaintenanceIssueRecord,
  MaintenanceAttachmentRecord,
  MaintenanceIssueFilters,
  MaintenanceIssueSort,
  MaintenanceIssueSortField,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { MAINTENANCE_CATEGORIES, isMaintenanceIssueOverdue, isCriticalMaintenancePriority } from "./domain/entities";
export {
  MaintenanceIssueNotFoundError,
  InvalidMaintenanceIssueTransitionError,
  MaintenanceIssueNotReopenableError,
  InvalidMaintenanceAssigneeError,
  InvalidMaintenanceAttachmentError,
} from "./domain/errors";
export type { DashboardStats as MaintenanceDashboardStats } from "./application/ports/maintenance-issue-repository";

export { reportMaintenanceIssueRouteHandler } from "./presentation/route-handlers/report";
export { getMaintenanceIssueRouteHandler } from "./presentation/route-handlers/get";
export { updateMaintenanceIssueRouteHandler } from "./presentation/route-handlers/update";
export { acknowledgeMaintenanceIssueRouteHandler } from "./presentation/route-handlers/acknowledge";
export { assignMaintenanceIssueRouteHandler } from "./presentation/route-handlers/assign";
export { reassignMaintenanceIssueRouteHandler } from "./presentation/route-handlers/reassign";
export { startMaintenanceIssueProgressRouteHandler } from "./presentation/route-handlers/start-progress";
export { resolveMaintenanceIssueRouteHandler } from "./presentation/route-handlers/resolve";
export { confirmMaintenanceResolutionRouteHandler } from "./presentation/route-handlers/confirm";
export { closeMaintenanceIssueRouteHandler } from "./presentation/route-handlers/close";
export { reopenMaintenanceIssueRouteHandler } from "./presentation/route-handlers/reopen";
export { addMaintenanceIssueUpdateRouteHandler } from "./presentation/route-handlers/add-update";
export { addMaintenanceAttachmentRouteHandler } from "./presentation/route-handlers/add-attachment";
export { getMaintenanceAttachmentRouteHandler } from "./presentation/route-handlers/get-attachment";
export { getMaintenanceIssueHistoryRouteHandler } from "./presentation/route-handlers/history";
export { searchMaintenanceIssuesRouteHandler } from "./presentation/route-handlers/search";
export { getMaintenanceDashboardStatsRouteHandler } from "./presentation/route-handlers/dashboard-stats";
