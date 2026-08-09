import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { ListSavedStudentsUseCase } from "../../../src/modules/recruiters/application/use-cases/list-saved-students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";
import { InMemoryRecruiterInteractionRepository } from "../../support/fakes/in-memory-recruiter-interaction-repository";
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

const BOB: RecruiterStudentProfileDTO = { ...ALICE, studentId: "s2", fullName: "Bob Builder" };

describe("ListSavedStudentsUseCase", () => {
  let directoryRepository: InMemoryRecruiterDirectoryRepository;
  let interactionRepository: InMemoryRecruiterInteractionRepository;
  let interestRepository: InMemoryRecruiterInterestRepository;
  let recruiterSelfLookup: FakeRecruiterSelfLookup;
  let useCase: ListSavedStudentsUseCase;

  beforeEach(() => {
    directoryRepository = new InMemoryRecruiterDirectoryRepository();
    directoryRepository.seedApproved(ALICE);
    directoryRepository.seedApproved(BOB);
    interactionRepository = new InMemoryRecruiterInteractionRepository();
    interestRepository = new InMemoryRecruiterInterestRepository();
    recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1");
    useCase = new ListSavedStudentsUseCase({ directoryRepository, interactionRepository, interestRepository, recruiterSelfLookup });
  });

  it("returns only students this recruiter has saved, with isSaved/isShortlisted merged in", async () => {
    await interactionRepository.setSaved("recruiter-profile-1", "s1", true);
    const result = await useCase.execute(recruiter);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ studentId: "s1", isSaved: true });
  });

  it("returns an empty array when nothing is saved", async () => {
    const result = await useCase.execute(recruiter);
    expect(result).toEqual([]);
  });

  it("never includes an unsaved student even if the recruiter previously interacted with them", async () => {
    await interactionRepository.setSaved("recruiter-profile-1", "s1", true);
    await interactionRepository.setSaved("recruiter-profile-1", "s1", false);
    const result = await useCase.execute(recruiter);
    expect(result).toEqual([]);
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("returns an empty array for a recruiter with no resolvable RecruiterProfile", async () => {
    const orphan: AuthenticatedActor = { userId: "rec-orphan", role: "RECRUITER" };
    const result = await useCase.execute(orphan);
    expect(result).toEqual([]);
  });
});
