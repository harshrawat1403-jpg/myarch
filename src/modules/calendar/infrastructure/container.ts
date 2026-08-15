/**
 * Composition root for the calendar module. No secrets/DB access of its
 * own — the registry is pure in-memory and each source owns its own data
 * access — so this is safe to construct eagerly, mirroring jobs' container.
 */
import { CalendarSourceRegistry } from "../application/calendar-source-registry";
import { GetCalendarEntriesUseCase } from "../application/use-cases/get-calendar-entries";
import { TaskCalendarSource } from "./task-calendar-source";

/** Shared, mutable source registry. Other modules register into this from their own composition root — the same pattern as jobs' `jobRegistry`. */
export const calendarSourceRegistry = new CalendarSourceRegistry();

// TaskCalendarSource is calendar's own adapter over Task Engine (see that
// file's doc comment for why it lives here rather than in tasks/) —
// registered eagerly since calendar already depends on tasks for it.
// Events'/Meetings' own calendar sources register themselves from THEIR OWN
// containers by importing `calendarSourceRegistry` from this module's
// public barrel and calling `.register(...)`, exactly like jobs' JobRegistry.
calendarSourceRegistry.register(new TaskCalendarSource());

export const getCalendarEntriesUseCase = new GetCalendarEntriesUseCase({ registry: calendarSourceRegistry });
