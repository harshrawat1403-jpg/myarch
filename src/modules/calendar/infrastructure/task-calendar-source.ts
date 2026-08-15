import type { AuthenticatedActor } from "@/modules/auth";
import { searchTasksUseCase, type TaskStatus } from "@/modules/tasks";
import type { CalendarSource } from "../application/ports/calendar-source";
import type { CalendarDateRange, CalendarEntry, CalendarFilters } from "../domain/entities";

const TASK_ACTIVITY_TYPE = "TASK_DEADLINE";
const TASK_STATUS_VALUES: readonly TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

/**
 * Registers the Task/Follow-up Engine's own deadline-bearing tasks as
 * calendar entries. Task Engine predates Calendar and has no
 * calendar-awareness of its own, so this adapter lives here (calendar's
 * infrastructure), not in tasks/ — the same "the consumer owns the
 * adapter" shape as notifications' own job-handler registration.
 *
 * Delegates to `searchTasksUseCase`, which already applies Task Engine's
 * own role-based scoping (Secretary unscoped; Coordinator limited to
 * owned/created; Student limited to own; Recruiter/Alumni see nothing) — so
 * this source never needs its own authorization logic.
 *
 * A task with no deadline never becomes a calendar entry (it has no
 * occurrence in time to plot). Results are capped at Task Engine's own
 * MAX_PAGE_SIZE (100) per query — a reasonable bound for a single
 * date-range view; see MYARCH_ROADMAP.md's Phase 3 report, KNOWN ISSUES.
 */
export class TaskCalendarSource implements CalendarSource {
  readonly sourceModule = "tasks";

  async findEntries(
    range: CalendarDateRange,
    filters: CalendarFilters,
    actor: AuthenticatedActor,
  ): Promise<CalendarEntry[]> {
    if (filters.activityType && filters.activityType !== TASK_ACTIVITY_TYPE) return [];

    const status =
      filters.status && (TASK_STATUS_VALUES as readonly string[]).includes(filters.status)
        ? (filters.status as TaskStatus)
        : undefined;

    const result = await searchTasksUseCase.execute({
      actor,
      filters: {
        deadlineFrom: range.from,
        deadlineTo: range.to,
        ownerId: filters.ownerId,
        status,
      },
      sort: { field: "deadline", direction: "asc" },
      pageSize: 100,
    });

    return result.items
      .filter((task) => task.deadline !== null)
      .map((task) => ({
        id: `task:${task.id}`,
        sourceModule: "tasks",
        activityType: TASK_ACTIVITY_TYPE,
        title: task.title,
        description: task.description,
        startAt: task.deadline as Date,
        endAt: null,
        location: null,
        ownerId: task.ownerId,
        status: task.status,
        relatedEntityType: task.relatedEntityType,
        relatedEntityId: task.relatedEntityId,
      }));
  }
}
