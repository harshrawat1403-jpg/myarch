/**
 * Framework-free Domain layer types for the Task/Follow-up Engine (MYARCH
 * Phase 2, §3.8) — reusable infrastructure every future domain named in the
 * roadmap (maintenance, generic requests, events, meetings, applications,
 * interviews, elections, projects) is expected to build on via
 * relatedEntityType/relatedEntityId, rather than each inventing its own
 * task/assignment/deadline/escalation system.
 */

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;

  readonly ownerId: string;
  readonly creatorId: string;

  readonly deadline: Date | null;
  readonly reminderAt: Date | null;

  readonly escalatedAt: Date | null;
  readonly escalatedToId: string | null;

  /** Polymorphic link to a future domain entity — see schema.prisma's Task model doc comment. Both null for a standalone to-do. */
  readonly relatedEntityType: string | null;
  readonly relatedEntityId: string | null;

  readonly completedAt: Date | null;
  readonly cancelledAt: Date | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TaskCommentRecord {
  readonly id: string;
  readonly taskId: string;
  readonly authorId: string;
  readonly body: string;
  readonly createdAt: Date;
}

export interface TaskFilters {
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly ownerId?: string;
  readonly creatorId?: string;
  /** ownerId = X OR creatorId = X — the role-based scoping SearchTasksUseCase forces for a Coordinator ("only tasks they are authorized to manage"), distinct from the explicit single-field ownerId/creatorId filters above which narrow further within that scope. */
  readonly involvingUserId?: string;
  readonly relatedEntityType?: string;
  readonly relatedEntityId?: string;
  /** deadline < now AND status not in (DONE, CANCELLED). */
  readonly overdueOnly?: boolean;
  readonly search?: string;
}

export type TaskSortField = "createdAt" | "deadline" | "priority" | "updatedAt";
export type SortDirection = "asc" | "desc";

export interface TaskSort {
  readonly field: TaskSortField;
  readonly direction: SortDirection;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_DESCRIPTION_MAX_LENGTH = 5000;
export const TASK_COMMENT_MAX_LENGTH = 2000;

/** Pure — no DB round trip. A task is overdue only while still active (not DONE/CANCELLED). */
export function isTaskOverdue(task: Pick<TaskRecord, "deadline" | "status">, now: Date = new Date()): boolean {
  if (!task.deadline) return false;
  if (task.status === "DONE" || task.status === "CANCELLED") return false;
  return task.deadline.getTime() < now.getTime();
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === "DONE" || status === "CANCELLED";
}

/**
 * Job types this module registers with the Background Job Processing
 * System (src/modules/jobs) and dispatches under — owned here, not in the
 * jobs module (see jobs/domain/entities.ts's JobType doc comment for why).
 * One-shot jobs scheduled at create/update time via JobDispatcher's `runAt`
 * option; each handler re-reads the task's CURRENT deadline/reminderAt at
 * fire time and no-ops if it has since moved — a later edit doesn't need to
 * cancel the now-stale job, it just schedules a fresh one for the new time
 * and lets the old one harmlessly self-correct.
 */
export const TASK_REMINDER_CHECK_JOB_TYPE = "TASK_REMINDER_CHECK";
export const TASK_OVERDUE_CHECK_JOB_TYPE = "TASK_OVERDUE_CHECK";

export interface TaskReminderCheckJobPayload {
  readonly taskId: string;
}

export interface TaskOverdueCheckJobPayload {
  readonly taskId: string;
}
