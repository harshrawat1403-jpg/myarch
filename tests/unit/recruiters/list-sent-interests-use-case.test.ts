import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { ListSentInterestsUseCase } from "../../../src/modules/recruiters/application/use-cases/list-sent-interests";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";
import { InMemoryRecruiterInterestRepository } from "../../support/fakes/in-memory-recruiter-interest-repository";
import { FakeRecruiterSelfLookup } from "../../support/fakes/fake-recruiter-self-lookup";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

const ALICE: RecruiterStudentProfileDTO = {
  studentId: "s1",
  fullName: "Alice Architect",
  batchId: "batch-a",
  batchName: "B.Arch 2026",
  bio: null,
  skills: [],
  software: [],
  selectedProjects: [],
  portfolioLinks: [],
  certifications: [],
  internships: [],
  hasResume: false,
  profilePhotoUrl: null,
  isSaved: false,
  isShortlisted: false,
  interestStatus: null,
};

describe("ListSentInterestsUseCase", () => {
  let directoryRepository: InMemoryRecruiterDirectoryRepository;
  let interestRepository: InMemoryRecruiterInterestRepository;
  let recruiterSelfLookup: FakeRecruiterSelfLookup;
  let useCase: ListSentInterestsUseCase;

  beforeEach(() => {
    directoryRepository = new InMemoryRecruiterDirectoryRepository();
    directoryRepository.seedApproved(ALICE);
    interestRepository = new InMemoryRecruiterInterestRepository();
    recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1");
    useCase = new ListSentInterestsUseCase({ directoryRepository, interestRepository, recruiterSelfLookup });
  });

  it("returns the recruiter's sent interests joined with the student's name and batch", async () => {
    interestRepository.seed({
      id: "int-1",
      recruiterProfileId: "recruiter-profile-1",
      studentProfileId: "s1",
      message: "Great portfolio!",
      status: "SENT",
      sentAt: new Date("2026-01-01"),
      respondedAt: null,
      completedAt: null,
    });

    const result = await useCase.execute(recruiter);
    expect(result).toEqual([
      {
        id: "int-1",
        studentId: "s1",
        studentName: "Alice Architect",
        batchName: "B.Arch 2026",
        message: "Great portfolio!",
        status: "SENT",
        sentAt: new Date("2026-01-01"),
        respondedAt: null,
      },
    ]);
  });

  it("omits an interest whose student is no longer visible in the directory", async () => {
    interestRepository.seed({
      id: "int-2",
      recruiterProfileId: "recruiter-profile-1",
      studentProfileId: "unknown-student",
      message: null,
      status: "SENT",
      sentAt: new Date("2026-01-01"),
      respondedAt: null,
      completedAt: null,
    });

    const result = await useCase.execute(recruiter);
    expect(result).toEqual([]);
  });

  it("returns an empty array when nothing has been sent", async () => {
    const result = await useCase.execute(recruiter);
    expect(result).toEqual([]);
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
