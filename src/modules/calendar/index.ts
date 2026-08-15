/**
 * Public exports of the calendar module — the Central Activity Calendar
 * (MYARCH Phase 3, §4.1). Other modules must import only from here
 * (docs/architecture/07_Repository_Structure.md).
 *
 * There is no CalendarEvent/CalendarEntry Prisma model: a CalendarEntry is a
 * normalized, read-only projection computed at query time from each
 * registered CalendarSource — see domain/entities.ts's own doc comment. A
 * future domain module (events, meetings, announcements, ...) that wants to
 * appear on the calendar implements `CalendarSource` and calls
 * `calendarSourceRegistry.register(...)` from its own composition root,
 * exactly like jobs' `jobRegistry.register(...)` pattern.
 */

export type { CalendarActivityType, CalendarEntry, CalendarDateRange, CalendarFilters } from "./domain/entities";
export { MAX_CALENDAR_RANGE_DAYS, isValidCalendarRange, calendarRangeSpanDays } from "./domain/entities";
export { InvalidCalendarRangeError } from "./domain/errors";

export type { CalendarSource } from "./application/ports/calendar-source";
export { CalendarSourceRegistry } from "./application/calendar-source-registry";
export { GetCalendarEntriesUseCase } from "./application/use-cases/get-calendar-entries";

export { getCalendarEntriesRouteHandler } from "./presentation/route-handlers/get";

// Shared, mutable singleton — other modules register their own CalendarSource
// into this from their own composition root. `getCalendarEntriesUseCase` is
// the bound, ready-to-use use case the route handler (and any future
// server-side caller) queries.
export { calendarSourceRegistry, getCalendarEntriesUseCase } from "./infrastructure/container";
