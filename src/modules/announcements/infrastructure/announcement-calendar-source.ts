import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { CalendarSource } from "@/modules/calendar";
import type { CalendarDateRange, CalendarEntry, CalendarFilters } from "@/modules/calendar";
import type { AnnouncementRepository } from "../application/ports/announcement-repository";
import type { StudentBatchLookup } from "../application/ports/student-batch-lookup";
import type { CommitteeMembershipLookup } from "../application/ports/committee-membership-lookup";

const ANNOUNCEMENT_ACTIVITY_TYPE = "ANNOUNCEMENT";

/**
 * Registers Announcements (§4.5) with the Central Activity Calendar (§4.1).
 * An announcement's calendar occurrence is its publishAt. Visibility reuses
 * SearchAnnouncementsUseCase's own scoping (Secretary/a Coordinator
 * delegated announcements.manage see everything; everyone else only active
 * announcements they're addressed by).
 */
export class AnnouncementCalendarSource implements CalendarSource {
  readonly sourceModule = "announcements";

  constructor(
    private readonly deps: {
      announcementRepository: AnnouncementRepository;
      studentBatchLookup: StudentBatchLookup;
      committeeMembershipLookup: CommitteeMembershipLookup;
    },
  ) {}

  async findEntries(range: CalendarDateRange, filters: CalendarFilters, actor: AuthenticatedActor): Promise<CalendarEntry[]> {
    if (filters.activityType && filters.activityType !== ANNOUNCEMENT_ACTIVITY_TYPE) return [];

    const isPrivileged = actor.role === "SECRETARY" || (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "announcements.manage"));

    const scopeFilters = isPrivileged
      ? {}
      : {
          activeOnly: true as const,
          audienceScopeFor: {
            userId: actor.userId,
            role: actor.role,
            batchId: await this.deps.studentBatchLookup.findBatchIdByUserId(actor.userId),
            committeeIds: await this.deps.committeeMembershipLookup.listActiveCommitteeIds(actor.userId),
            isCouncilMember: await this.deps.committeeMembershipLookup.isActiveStudentCouncilMember(actor.userId),
          },
        };

    const result = await this.deps.announcementRepository.search(
      { publishAtFrom: range.from, publishAtTo: range.to, authorId: filters.ownerId, ...scopeFilters },
      { field: "publishAt", direction: "asc" },
      { page: 1, pageSize: 100 },
    );

    return result.items.map((announcement) => ({
      id: `announcement:${announcement.id}`,
      sourceModule: "announcements",
      activityType: ANNOUNCEMENT_ACTIVITY_TYPE,
      title: announcement.title,
      description: announcement.content,
      startAt: announcement.publishAt,
      endAt: announcement.expiresAt,
      location: null,
      ownerId: announcement.authorId,
      status: null,
      relatedEntityType: "Announcement",
      relatedEntityId: announcement.id,
    }));
  }
}
