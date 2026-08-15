import type { AuthenticatedActor } from "@/modules/auth";
import type { CalendarSource } from "@/modules/calendar";
import type { CalendarDateRange, CalendarEntry, CalendarFilters } from "@/modules/calendar";
import { canViewEvent } from "../domain/permissions";
import type { EventRepository } from "../application/ports/event-repository";

const EVENT_ACTIVITY_TYPE = "EVENT";

/**
 * Registers Events (§4.2) with the Central Activity Calendar (§4.1).
 * Applies canViewEvent per-row after a broad date-range fetch — a Coordinator
 * without events.view/manage should still see published events on the
 * calendar (canViewEvent already allows that), so this can't just delegate
 * to SearchEventsUseCase's own narrower "own-or-published" default scoping,
 * which exists for the events LIST screen, not calendar visibility.
 */
export class EventCalendarSource implements CalendarSource {
  readonly sourceModule = "events";

  constructor(private readonly deps: { eventRepository: EventRepository }) {}

  async findEntries(range: CalendarDateRange, filters: CalendarFilters, actor: AuthenticatedActor): Promise<CalendarEntry[]> {
    if (filters.activityType && filters.activityType !== EVENT_ACTIVITY_TYPE) return [];

    const result = await this.deps.eventRepository.search(
      { startAtFrom: range.from, startAtTo: range.to, organizerId: filters.ownerId },
      { field: "startAt", direction: "asc" },
      { page: 1, pageSize: 100 },
    );

    return result.items
      .filter((event) => canViewEvent(actor, event))
      .map((event) => ({
        id: `event:${event.id}`,
        sourceModule: "events",
        activityType: EVENT_ACTIVITY_TYPE,
        title: event.title,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.venue,
        ownerId: event.organizerId,
        status: event.status,
        relatedEntityType: "Event",
        relatedEntityId: event.id,
      }));
  }
}
