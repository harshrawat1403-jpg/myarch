import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { CalendarSource } from "@/modules/calendar";
import type { CalendarDateRange, CalendarEntry, CalendarFilters } from "@/modules/calendar";
import type { MeetingRepository } from "../application/ports/meeting-repository";

const MEETING_ACTIVITY_TYPE = "MEETING";

/**
 * Registers Meetings (§4.4) with the Central Activity Calendar (§4.1).
 * Meetings have no public/published state (unlike Events) — visibility is
 * exactly SearchMeetingsUseCase's own scoping (Secretary/a Coordinator
 * delegated meetings.manage see everything; everyone else only meetings
 * they organize or participate in), reused here rather than duplicated.
 */
export class MeetingCalendarSource implements CalendarSource {
  readonly sourceModule = "meetings";

  constructor(private readonly deps: { meetingRepository: MeetingRepository }) {}

  async findEntries(range: CalendarDateRange, filters: CalendarFilters, actor: AuthenticatedActor): Promise<CalendarEntry[]> {
    if (filters.activityType && filters.activityType !== MEETING_ACTIVITY_TYPE) return [];

    const isPrivileged = actor.role === "SECRETARY" || (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "meetings.manage"));

    const result = await this.deps.meetingRepository.search(
      {
        startAtFrom: range.from,
        startAtTo: range.to,
        organizerId: filters.ownerId,
        involvingUserId: isPrivileged ? undefined : actor.userId,
        // MYARCH Phase 4 (§5) — the Calendar's "committee" filter, applied
        // to meetings linked via Meeting.committeeId.
        committeeId: filters.committee,
      },
      { field: "startAt", direction: "asc" },
      { page: 1, pageSize: 100 },
    );

    return result.items.map((meeting) => ({
      id: `meeting:${meeting.id}`,
      sourceModule: "meetings",
      activityType: MEETING_ACTIVITY_TYPE,
      title: meeting.title,
      description: meeting.agenda,
      startAt: meeting.startAt,
      endAt: null,
      location: meeting.venueOrLink,
      ownerId: meeting.organizerId,
      status: meeting.status,
      relatedEntityType: "Meeting",
      relatedEntityId: meeting.id,
    }));
  }
}
