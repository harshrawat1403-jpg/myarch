/**
 * Public exports of the tasks module — the reusable Task/Follow-up Engine
 * (MYARCH Phase 2, §3.8). Other modules must import only from here
 * (docs/architecture/07_Repository_Structure.md). A future domain module
 * (maintenance, generic requests, events, meetings, applications,
 * interviews, elections, projects) that wants a task creates one via
 * `createTaskUseCase.execute({ ..., relatedEntityType: "MaintenanceIssue",
 * relatedEntityId: issue.id })` rather than building its own task system.
 */

export type {
  TaskStatus,
  TaskPriority,
  TaskRecord,
  TaskCommentRecord,
  TaskFilters,
  TaskSort,
  TaskSortField,
  SortDirection,
  PaginatedResult,
  PaginationInput,
} from "./domain/entities";
export { isTaskOverdue, isTerminalTaskStatus } from "./domain/entities";
export {
  TaskNotFoundError,
  InvalidTaskStatusTransitionError,
  TaskNotReopenableError,
  CannotAssignTaskToRoleError,
  TaskCommentBodyRequiredError,
} from "./domain/errors";
export { canViewTask, canManageTask, canCreateTask } from "./domain/permissions";

export { createTaskRouteHandler } from "./presentation/route-handlers/create";
export { getTaskRouteHandler } from "./presentation/route-handlers/get";
export { updateTaskRouteHandler } from "./presentation/route-handlers/update";
export { reassignTaskRouteHandler } from "./presentation/route-handlers/reassign";
export { setTaskStatusRouteHandler } from "./presentation/route-handlers/set-status";
export { reopenTaskRouteHandler } from "./presentation/route-handlers/reopen";
export { escalateTaskRouteHandler } from "./presentation/route-handlers/escalate";
export { addTaskCommentRouteHandler } from "./presentation/route-handlers/add-comment";
export { searchTasksRouteHandler } from "./presentation/route-handlers/search";

/**
 * Direct use-case access for a future domain module to create/query/drive
 * tasks from its own use cases (e.g. the Maintenance module creating a Task
 * on assignment, then advancing/reassigning/reopening it as the linked
 * MaintenanceIssue moves through its own lifecycle) — the same "export the
 * bound use case, not just the route handler" shape as coordinators'
 * `assignBatchUseCase`.
 */
export {
  createTaskUseCase,
  getTaskUseCase,
  searchTasksUseCase,
  setTaskStatusUseCase,
  reassignTaskUseCase,
  reopenTaskUseCase,
  updateTaskUseCase,
  addTaskCommentUseCase,
} from "./infrastructure/container";

// Called explicitly by scripts/run-worker.ts to register this module's
// TASK_REMINDER_CHECK/TASK_OVERDUE_CHECK handlers into the shared job
// registry. Never invoked as a side effect of importing this module.
export { registerJobHandlers } from "./infrastructure/container";
