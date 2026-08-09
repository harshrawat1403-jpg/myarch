import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetRecruiterOverviewUseCase } from "../../../src/modules/recruiters/application/use-cases/get-recruiter-overview";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterInteractionRepository } from "../../support/fakes/in-memory-recruiter-interaction-repository";
import { InMemoryRecruiterInterestRepository } from "../../support/fakes/in-memory-recruiter-interest-repository";
import { FakeRecruiterSelfLookup } from "../../support/fakes/fake-recruiter-self-lookup";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

describe("GetRecruiterOverviewUseCase", () => {
  let interactionRepository: InMemoryRecruiterInteractionRepository;
  let interestRepository: InMemoryRecruiterInterestRepository;
  let recruiterSelfLookup: FakeRecruiterSelfLookup;
  let useCase: GetRecruiterOverviewUseCase;

  beforeEach(() => {
    interactionRepository = new InMemoryRecruiterInteractionRepository();
    interestRepository = new InMemoryRecruiterInterestRepository();
    recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1");
    useCase = new GetRecruiterOverviewUseCase({ interactionRepository, interestRepository, recruiterSelfLookup });
  });

  it("counts saved, shortlisted, sent, and accepted correctly", async () => {
    await interactionRepository.setSaved("recruiter-profile-1", "s1", true);
    await interactionRepository.setSaved("recruiter-profile-1", "s2", true);
    await interactionRepository.setShortlisted("recruiter-profile-1", "s1", true);

    interestRepository.seed({
      id: "int-1",
      recruiterProfileId: "recruiter-profile-1",
      studentProfileId: "s1",
      message: null,
      status: "ACCEPTED",
      sentAt: new Date(),
      respondedAt: new Date(),
      completedAt: null,
    });
    interestRepository.seed({
      id: "int-2",
      recruiterProfileId: "recruiter-profile-1",
      studentProfileId: "s2",
      message: null,
      status: "SENT",
      sentAt: new Date(),
      respondedAt: null,
      completedAt: null,
    });

    const result = await useCase.execute(recruiter);
    expect(result).toEqual({
      companyName: "Acme Architects",
      savedCount: 2,
      shortlistedCount: 1,
      interestsSentCount: 2,
      interestsAcceptedCount: 1,
    });
  });

  it("returns all-zero stats when the recruiter has no activity", async () => {
    const result = await useCase.execute(recruiter);
    expect(result).toEqual({ companyName: "Acme Architects", savedCount: 0, shortlistedCount: 0, interestsSentCount: 0, interestsAcceptedCount: 0 });
  });

  it("returns all-zero stats for a recruiter with no resolvable RecruiterProfile", async () => {
    const orphan: AuthenticatedActor = { userId: "rec-orphan", role: "RECRUITER" };
    const result = await useCase.execute(orphan);
    expect(result).toEqual({ companyName: "", savedCount: 0, shortlistedCount: 0, interestsSentCount: 0, interestsAcceptedCount: 0 });
  });

  it("V4.0 E8: includes the recruiter's own companyName (already fetched via recruiterSelfLookup — no additional query)", async () => {
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1", "Studio Nine");
    const result = await useCase.execute(recruiter);
    expect(result.companyName).toBe("Studio Nine");
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
