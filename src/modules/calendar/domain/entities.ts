/**
 * Framework-free Domain layer types for the Central Activity Calendar
 * (MYARCH Phase 3, §4.1). There is deliberately no CalendarEvent/CalendarEntry
 * Prisma model — a CalendarEntry is a normalized, read-only projection
 * computed at query time from each owning domain's own dated rows
 * (Task.deadline, Event.startAt, Meeting.startAt, Announcement.publishAt,
 * ...). See application/ports/calendar-source.ts and
 * application/calendar-source-registry.ts for how a domain module registers
 * itself as a source — the same registry shape as src/modules/jobs's
 * JobRegistry.
 */

/**
 * Deliberately an open string, not a closed union — mirroring jobs'
 * `JobType`. Each CalendarSource declares its own activityType string(s);
 * this module never needs to change to support a new one. §4.1 names
 * events/meetings/elections/interviews/application deadlines/workshops/
 * competitions/reviews/submissions/maintenance shutdowns/council
 * activities/technical activities/project milestones as the eventual full
 * catalog — only "TASK_DEADLINE", "EVENT", and "MEETING" have a real
 * registered source as of this phase (see calendar-source-registry.ts's own
 * doc comment for what's deferred and why).
 */
export type CalendarActivityType = string;

export interface CalendarEntry {
  /** Globally unique across all sources, e.g. `task:${taskId}` — never reused as a DB primary key. */
  readonly id: string;
  /** Which module produced this entry, e.g. "tasks", "events", "meetings". */
  readonly sourceModule: string;
  readonly activityType: CalendarActivityType;
  readonly title: string;
  readonly description: string | null;
  readonly startAt: Date;
  readonly endAt: Date | null;
  readonly location: string | null;
  readonly ownerId: string | null;
  /** Free-form — each source's own status vocabulary (TaskStatus, EventStatus, MeetingStatus, ...), not a shared enum. */
  readonly status: string | null;
  /** Polymorphic link back to the real owning row, mirroring Task.relatedEntityType/Id — lets the UI deep-link to the source entity. */
  readonly relatedEntityType: string | null;
  readonly relatedEntityId: string | null;
}

export interface CalendarDateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface CalendarFilters {
  readonly activityType?: CalendarActivityType;
  readonly ownerId?: string;
  readonly status?: string;
}

export const MAX_CALENDAR_RANGE_DAYS = 366;

/** Pure — no DB round trip. */
export function isValidCalendarRange(range: CalendarDateRange): boolean {
  return range.from.getTime() <= range.to.getTime();
}

export function calendarRangeSpanDays(range: CalendarDateRange): number {
  return (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
}
