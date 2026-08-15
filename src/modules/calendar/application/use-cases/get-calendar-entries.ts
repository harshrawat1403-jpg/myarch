import type { AuthenticatedActor } from "@/modules/auth";
import {
  calendarRangeSpanDays,
  isValidCalendarRange,
  MAX_CALENDAR_RANGE_DAYS,
  type CalendarDateRange,
  type CalendarEntry,
  type CalendarFilters,
} from "../../domain/entities";
import { InvalidCalendarRangeError } from "../../domain/errors";
import type { CalendarSourceRegistry } from "../calendar-source-registry";

export interface GetCalendarEntriesInput {
  actor: AuthenticatedActor;
  range: CalendarDateRange;
  filters?: CalendarFilters;
}

/**
 * Fans out to every registered CalendarSource in parallel, then merges and
 * sorts by startAt. A source is expected to apply the given filters itself
 * (cheaper — narrows its own query), but this use case re-applies
 * activityType/ownerId/status defensively after merging so a source that
 * ignores a filter it doesn't understand can never leak unfiltered rows
 * into the response.
 *
 * A single source rejecting (e.g. a transient DB error) does not fail the
 * whole calendar — Promise.allSettled means one broken/slow module never
 * takes down every other module's view.
 */
export class GetCalendarEntriesUseCase {
  constructor(private readonly deps: { registry: CalendarSourceRegistry }) {}

  async execute(input: GetCalendarEntriesInput): Promise<CalendarEntry[]> {
    if (!isValidCalendarRange(input.range)) {
      throw new InvalidCalendarRangeError("`from` must not be after `to`");
    }
    if (calendarRangeSpanDays(input.range) > MAX_CALENDAR_RANGE_DAYS) {
      throw new InvalidCalendarRangeError(`range must not exceed ${MAX_CALENDAR_RANGE_DAYS} days`);
    }

    const filters = input.filters ?? {};
    const results = await Promise.allSettled(
      this.deps.registry.all().map((source) => source.findEntries(input.range, filters, input.actor)),
    );

    let entries: CalendarEntry[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        entries.push(...result.value);
      }
    }

    if (filters.activityType) entries = entries.filter((entry) => entry.activityType === filters.activityType);
    if (filters.ownerId) entries = entries.filter((entry) => entry.ownerId === filters.ownerId);
    if (filters.status) entries = entries.filter((entry) => entry.status === filters.status);

    entries.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return entries;
  }
}
