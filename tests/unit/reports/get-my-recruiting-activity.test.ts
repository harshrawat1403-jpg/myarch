import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetMyRecruitingActivityUseCase } from "../../../src/modules/reports/application/use-cases/get-my-recruiting-activity";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { FakeRecruitingActivityRepository } from "../../support/fakes/fake-recruiting-activity-repository";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const otherRecruiter: AuthenticatedActor = { userId: "rec-2", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

describe("GetMyRecruitingActivityUseCase (V4.0 E7 — PRD §4 Recruiter Reports: 'Own data only')", () => {
  let repository: FakeRecruitingActivityRepository;
  let useCase: GetMyRecruitingActivityUseCase;

  beforeEach(() => {
    repository = new FakeRecruitingActivityRepository();
    useCase = new GetMyRecruitingActivityUseCase({ repository });
  });

  it("resolves the acting recruiter's own profile and returns only their own activity", async () => {
    repository.recruiterProfileIdByUserId = { "rec-1": "rp-1", "rec-2": "rp-2" };
    repository.activityByRecruiterProfileId = {
      "rp-1": { savedCount: 3, shortlistedCount: 1, interestsSentCount: 2, interestsAcceptedCount: 1, interestsDeclinedCount: 0, interestsPendingCount: 1, interests: [] },
      "rp-2": { savedCount: 99, shortlistedCount: 99, interestsSentCount: 99, interestsAcceptedCount: 99, interestsDeclinedCount: 99, interestsPendingCount: 99, interests: [] },
    };

    const report = await useCase.execute(recruiter);
    expect(report.savedCount).toBe(3);

    const otherReport = await useCase.execute(otherRecruiter);
    expect(otherReport.savedCount).toBe(99);
  });

  it("returns an all-zero report (not an error) when the recruiter has no profile row yet", async () => {
    const report = await useCase.execute(recruiter);
    expect(report).toEqual({
      savedCount: 0,
      shortlistedCount: 0,
      interestsSentCount: 0,
      interestsAcceptedCount: 0,
      interestsDeclinedCount: 0,
      interestsPendingCount: 0,
      interests: [],
    });
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute(student)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
