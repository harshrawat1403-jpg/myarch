import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type AnnouncementFilters,
  type AnnouncementRecord,
  type AnnouncementSort,
  type PaginatedResult,
} from "../../domain/entities";
import type { AnnouncementRepository } from "../ports/announcement-repository";
import type { StudentBatchLookup } from "../ports/student-batch-lookup";
import type { CommitteeMembershipLookup } from "../ports/committee-membership-lookup";

export interface SearchAnnouncementsInput {
  actor: AuthenticatedActor;
  filters?: AnnouncementFilters;
  sort?: AnnouncementSort;
  page?: number;
  pageSize?: number;
}

/**
 * Secretary and a Coordinator delegated `announcements.manage` see every
 * announcement (including future-dated/expired, for editing) unscoped.
 * Everyone else is forced `activeOnly` plus `audienceScopeFor` — the
 * repository's SQL translation of isActorInAudience's own truth table —
 * so pagination totals stay accurate rather than being computed by
 * over-fetching and filtering in the application layer.
 */
export class SearchAnnouncementsUseCase {
  constructor(
    private readonly deps: {
      announcementRepository: AnnouncementRepository;
      studentBatchLookup: StudentBatchLookup;
      committeeMembershipLookup: CommitteeMembershipLookup;
    },
  ) {}

  async execute(input: SearchAnnouncementsInput): Promise<PaginatedResult<AnnouncementRecord>> {
    const requested = input.filters ?? {};
    const isPrivileged =
      input.actor.role === "SECRETARY" ||
      (input.actor.role === "COORDINATOR" && hasCoordinatorPermission(input.actor, "announcements.manage"));

    let filters: AnnouncementFilters;
    if (isPrivileged) {
      filters = requested;
    } else {
      const [batchId, committeeIds, isCouncilMember] = await Promise.all([
        this.deps.studentBatchLookup.findBatchIdByUserId(input.actor.userId),
        this.deps.committeeMembershipLookup.listActiveCommitteeIds(input.actor.userId),
        this.deps.committeeMembershipLookup.isActiveStudentCouncilMember(input.actor.userId),
      ]);
      filters = {
        ...requested,
        activeOnly: true,
        audienceScopeFor: { userId: input.actor.userId, role: input.actor.role, batchId, committeeIds, isCouncilMember },
      };
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? { field: "publishAt", direction: "desc" };

    return this.deps.announcementRepository.search(filters, sort, { page, pageSize });
  }
}
