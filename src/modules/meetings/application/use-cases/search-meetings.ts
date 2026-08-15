import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type MeetingFilters,
  type MeetingRecord,
  type MeetingSort,
  type PaginatedResult,
} from "../../domain/entities";
import type { MeetingRepository } from "../ports/meeting-repository";

export interface SearchMeetingsInput {
  actor: AuthenticatedActor;
  filters?: MeetingFilters;
  sort?: MeetingSort;
  page?: number;
  pageSize?: number;
}

/** Secretary and a Coordinator delegated `meetings.manage` see every meeting unscoped. Everyone else is forced to meetings they organize or participate in (involvingUserId) — a Meeting has no public/published state like Events, so there is no "everyone sees non-draft" fallback here. */
export class SearchMeetingsUseCase {
  constructor(private readonly deps: { meetingRepository: MeetingRepository }) {}

  async execute(input: SearchMeetingsInput): Promise<PaginatedResult<MeetingRecord>> {
    const requested = input.filters ?? {};
    const isPrivileged = input.actor.role === "SECRETARY" || (input.actor.role === "COORDINATOR" && hasCoordinatorPermission(input.actor, "meetings.manage"));

    const filters: MeetingFilters = isPrivileged ? requested : { ...requested, involvingUserId: input.actor.userId };

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "startAt", direction: "asc" };

    return this.deps.meetingRepository.search(filters, sort, { page, pageSize });
  }
}
