import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { MyRecruitingActivityReport } from "../../domain/entities";
import type { RecruitingActivityRepository } from "../ports/recruiting-activity-repository";

const EMPTY: MyRecruitingActivityReport = {
  savedCount: 0,
  shortlistedCount: 0,
  interestsSentCount: 0,
  interestsAcceptedCount: 0,
  interestsDeclinedCount: 0,
  interestsPendingCount: 0,
  interests: [],
};

/** V4.0 E7 (PRD §4 — Recruiter Reports: "Own data only") — reuses the same own-activity data GetRecruiterOverviewUseCase already computes for the /recruiter dashboard, presented as a report. Never another recruiter's activity, never institutional drive/application data (no such recruiter-facing access exists anywhere in this app — see this milestone's completion report). */
export class GetMyRecruitingActivityUseCase {
  constructor(private readonly deps: { repository: RecruitingActivityRepository }) {}

  async execute(actor: AuthenticatedActor): Promise<MyRecruitingActivityReport> {
    if (!canAccessRecruiterDirectory(actor)) throw new NotAuthorizedError("Not authorized to view this report");

    const recruiterProfileId = await this.deps.repository.findRecruiterProfileId(actor.userId);
    if (!recruiterProfileId) return EMPTY;

    return this.deps.repository.getForRecruiter(recruiterProfileId);
  }
}
