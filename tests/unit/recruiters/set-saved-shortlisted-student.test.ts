import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { SetSavedStudentUseCase } from "../../../src/modules/recruiters/application/use-cases/set-saved-student";
import { SetShortlistedStudentUseCase } from "../../../src/modules/recruiters/application/use-cases/set-shortlisted-student";
import {
  ApprovedProfileNotFoundError,
  RecruiterProfileNotFoundError,
  StudentNotSavedError,
} from "../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";
import { InMemoryRecruiterInteractionRepository } from "../../support/fakes/in-memory-recruiter-interaction-repository";
import { FakeRecruiterSelfLookup } from "../../support/fakes/fake-recruiter-self-lookup";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

const APPROVED: RecruiterStudentProfileDTO = {
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

describe("SetSavedStudentUseCase", () => {
  let directoryRepository: InMemoryRecruiterDirectoryRepository;
  let interactionRepository: InMemoryRecruiterInteractionRepository;
  let recruiterSelfLookup: FakeRecruiterSelfLookup;
  let useCase: SetSavedStudentUseCase;

  beforeEach(() => {
    directoryRepository = new InMemoryRecruiterDirectoryRepository();
    directoryRepository.seedApproved(APPROVED);
    interactionRepository = new InMemoryRecruiterInteractionRepository();
    recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1");
    useCase = new SetSavedStudentUseCase({ directoryRepository, interactionRepository, recruiterSelfLookup });
  });

  it("saves a student", async () => {
    const result = await useCase.execute({ actor: recruiter, studentId: "s1", saved: true });
    expect(result.isSaved).toBe(true);
  });

  it("unsaves a student, also clearing isShortlisted (§8: shortlist is a filtered view of saved)", async () => {
    await useCase.execute({ actor: recruiter, studentId: "s1", saved: true });
    await interactionRepository.setShortlisted("recruiter-profile-1", "s1", true);

    const result = await useCase.execute({ actor: recruiter, studentId: "s1", saved: false });
    expect(result.isSaved).toBe(false);
    expect(result.isShortlisted).toBe(false);
  });

  it("denies a Secretary — this is the recruiter-only capability", async () => {
    await expect(useCase.execute({ actor: secretary, studentId: "s1", saved: true })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, studentId: "s1", saved: true })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws ApprovedProfileNotFoundError for a student the recruiter cannot see (never approved/inactive/archived batch)", async () => {
    await expect(
      useCase.execute({ actor: recruiter, studentId: "unknown-student", saved: true }),
    ).rejects.toBeInstanceOf(ApprovedProfileNotFoundError);
  });

  it("throws RecruiterProfileNotFoundError when the actor has no resolvable RecruiterProfile (defensive)", async () => {
    const orphanRecruiter: AuthenticatedActor = { userId: "rec-orphan", role: "RECRUITER" };
    await expect(
      useCase.execute({ actor: orphanRecruiter, studentId: "s1", saved: true }),
    ).rejects.toBeInstanceOf(RecruiterProfileNotFoundError);
  });
});

describe("SetShortlistedStudentUseCase", () => {
  let interactionRepository: InMemoryRecruiterInteractionRepository;
  let recruiterSelfLookup: FakeRecruiterSelfLookup;
  let useCase: SetShortlistedStudentUseCase;

  beforeEach(() => {
    interactionRepository = new InMemoryRecruiterInteractionRepository();
    recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1");
    useCase = new SetShortlistedStudentUseCase({ interactionRepository, recruiterSelfLookup });
  });

  it("promotes an already-saved student to shortlisted", async () => {
    await interactionRepository.setSaved("recruiter-profile-1", "s1", true);
    const result = await useCase.execute({ actor: recruiter, studentId: "s1", isShortlisted: true });
    expect(result.isShortlisted).toBe(true);
  });

  it("rejects shortlisting a student who was never saved (§8: 'promotes an ALREADY-SAVED student')", async () => {
    await expect(
      useCase.execute({ actor: recruiter, studentId: "s1", isShortlisted: true }),
    ).rejects.toBeInstanceOf(StudentNotSavedError);
  });

  it("allows un-shortlisting without requiring the saved check", async () => {
    await interactionRepository.setSaved("recruiter-profile-1", "s1", true);
    await interactionRepository.setShortlisted("recruiter-profile-1", "s1", true);
    const result = await useCase.execute({ actor: recruiter, studentId: "s1", isShortlisted: false });
    expect(result.isShortlisted).toBe(false);
  });

  it("denies a Secretary", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId: "s1", isShortlisted: true }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
