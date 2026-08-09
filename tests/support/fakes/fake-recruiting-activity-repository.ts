import type { RecruitingActivityCounts, RecruitingActivityRepository } from "../../../src/modules/reports/application/ports/recruiting-activity-repository";

const EMPTY: RecruitingActivityCounts = {
  savedCount: 0,
  shortlistedCount: 0,
  interestsSentCount: 0,
  interestsAcceptedCount: 0,
  interestsDeclinedCount: 0,
  interestsPendingCount: 0,
  interests: [],
};

export class FakeRecruitingActivityRepository implements RecruitingActivityRepository {
  recruiterProfileIdByUserId: Record<string, string> = {};
  activityByRecruiterProfileId: Record<string, RecruitingActivityCounts> = {};

  async findRecruiterProfileId(userId: string): Promise<string | null> {
    return this.recruiterProfileIdByUserId[userId] ?? null;
  }

  async getForRecruiter(recruiterProfileId: string): Promise<RecruitingActivityCounts> {
    return this.activityByRecruiterProfileId[recruiterProfileId] ?? EMPTY;
  }
}
