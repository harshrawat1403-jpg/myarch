import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type EventFilters,
  type EventRecord,
  type EventSort,
  type PaginatedResult,
} from "../../domain/entities";
import type { EventRepository } from "../ports/event-repository";

export interface SearchEventsInput {
  actor: AuthenticatedActor;
  filters?: EventFilters;
  sort?: EventSort;
  page?: number;
  pageSize?: number;
}

/**
 * Secretary and a Coordinator delegated `events.view`/`events.manage` see
 * every event unscoped. Everyone else is scoped per domain/permissions.ts's
 * canViewEvent: their own organized events (any status) plus every
 * non-DRAFT event — except an explicit request for status=DRAFT, which is
 * narrowed to their own drafts only rather than silently widened.
 */
export class SearchEventsUseCase {
  constructor(private readonly deps: { eventRepository: EventRepository }) {}

  async execute(input: SearchEventsInput): Promise<PaginatedResult<EventRecord>> {
    const requested = input.filters ?? {};
    const isPrivileged =
      input.actor.role === "SECRETARY" ||
      (input.actor.role === "COORDINATOR" &&
        (hasCoordinatorPermission(input.actor, "events.view") || hasCoordinatorPermission(input.actor, "events.manage")));

    let filters: EventFilters;
    if (isPrivileged) {
      filters = requested;
    } else if (requested.status === "DRAFT") {
      filters = { ...requested, organizerId: input.actor.userId };
    } else {
      filters = { ...requested, ownOrPublishedOnly: input.actor.userId };
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "startAt", direction: "asc" };

    return this.deps.eventRepository.search(filters, sort, { page, pageSize });
  }
}
