import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetPublishedProfileUseCase } from "../../../src/modules/profiles/application/use-cases/get-published-profile";
import { PublishedProfileNotFoundError } from "../../../src/modules/profiles/domain/errors";
import { StudentNotFoundError } from "../../../src/modules/students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPublishedProfileRepository } from "../../support/fakes/in-memory-published-profile-repository";
import { InMemoryProfilesStudentLookup } from "../../support/fakes/in-memory-profiles-student-lookup";

const STUDENT_ID = "student-1";
const owner: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: STUDENT_ID };
const otherStudent: AuthenticatedActor = {
  userId: "user-2",
  role: "STUDENT",
  studentProfileId: "student-2",
};
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorInScope: AuthenticatedActor = {
  userId: "coord-1",
  role: "COORDINATOR",
  batchScope: ["batch-a"],
};
const coordinatorOutOfScope: AuthenticatedActor = {
  userId: "coord-2",
  role: "COORDINATOR",
  batchScope: ["batch-b"],
};
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("GetPublishedProfileUseCase", () => {
  let publishedProfileRepository: InMemoryPublishedProfileRepository;
  let studentLookup: InMemoryProfilesStudentLookup;
  let useCase: GetPublishedProfileUseCase;

  beforeEach(async () => {
    publishedProfileRepository = new InMemoryPublishedProfileRepository();
    studentLookup = new InMemoryProfilesStudentLookup();
    studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1" });
    useCase = new GetPublishedProfileUseCase({ publishedProfileRepository, studentLookup });

    await publishedProfileRepository.publish({
      studentProfileId: STUDENT_ID,
      content: {
        bio: "Published bio",
        skills: [],
        software: [],
        selectedProjects: [],
        portfolioLinks: [],
        resumeFileId: null,
        certifications: [],
        internships: [],
      },
      publishedFromDraftId: "draft-1",
      publishedByUserId: "sec-1",
    });
  });

  it("allows the owning student", async () => {
    const profile = await useCase.execute({ actor: owner, studentId: STUDENT_ID });
    expect(profile.bio).toBe("Published bio");
  });

  it("allows the Secretary", async () => {
    const profile = await useCase.execute({ actor: secretary, studentId: STUDENT_ID });
    expect(profile.bio).toBe("Published bio");
  });

  it("allows an in-scope Coordinator", async () => {
    const profile = await useCase.execute({ actor: coordinatorInScope, studentId: STUDENT_ID });
    expect(profile.bio).toBe("Published bio");
  });

  it("denies an out-of-scope Coordinator", async () => {
    await expect(
      useCase.execute({ actor: coordinatorOutOfScope, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a different student", async () => {
    await expect(
      useCase.execute({ actor: otherStudent, studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Recruiter — this is the admin/self path, not the future recruiter directory", async () => {
    await expect(useCase.execute({ actor: recruiter, studentId: STUDENT_ID })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId: "unknown" }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("throws PublishedProfileNotFoundError when nothing has ever been approved", async () => {
    studentLookup.seed({ id: "never-published", batchId: "batch-a", userId: "user-y" });
    await expect(
      useCase.execute({ actor: secretary, studentId: "never-published" }),
    ).rejects.toBeInstanceOf(PublishedProfileNotFoundError);
  });
});
