import type { AuthenticatedActor } from "@/modules/auth";
import type { CalendarDateRange, CalendarEntry, CalendarFilters } from "../../domain/entities";

/**
 * The abstraction every domain module implements to feed the Central
 * Activity Calendar (§4.1) — mirrors jobs' `JobHandler`. A source knows only
 * how to fetch and normalize ITS OWN dated rows for a range; it never
 * touches any other module's data, and GetCalendarEntriesUseCase never
 * knows a given source's real backing table.
 *
 * A source is responsible for its own authorization — it receives the real
 * actor and decides what that actor may see (e.g. TaskCalendarSource reuses
 * Task Engine's own SearchTasksUseCase, which already applies
 * canViewTask-equivalent role-based scoping). GetCalendarEntriesUseCase
 * itself has no domain-specific authorization knowledge.
 */
export interface CalendarSource {
  readonly sourceModule: string;

  findEntries(
    range: CalendarDateRange,
    filters: CalendarFilters,
    actor: AuthenticatedActor,
  ): Promise<CalendarEntry[]>;
}
