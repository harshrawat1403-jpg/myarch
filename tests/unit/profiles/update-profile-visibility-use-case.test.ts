import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { UpdateProfileVisibilityUseCase } from "../../../src/modules/profiles/application/use-cases/update-profile-visibility";
import { PublishedProfileNotFoundError } from "../../../src/modules/profiles/domain/errors";
import { StudentNotFoundError } from "../../../src/modules/students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPublishedProfileRepository } from "../../support/fakes/in-memory-published-profile-repository";
import { InMemoryProfilesStudentLookup } from "../../support/fakes/in-memory-profiles-student-lookup";

const STUDENT_ID = "student-1";
const owner: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: STUDENT_ID };
const otherStudent: AuthenticatedActor = { userId: "user-2", role: "STUDENT", studentProfileId: "student-2" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorInScope: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };

const CONTENT = {
  bio: "Published bio",
  skills: [],
  software: [],
  selectedProjects: [],
  portfolioLinks: [],
  resumeFileId: null,
  certifications: [],
  internships: [],
};

describe("UpdateProfileVisibilityUseCase", () => {
  let publishedProfileRepository: InMemoryPublishedProfileRepository;
  let studentLookup: InMemoryProfilesStudentLookup;
  let useCase: UpdateProfileVisibilityUseCase;

  beforeEach(async () => {
    publishedProfileRepository = new InMemoryPublishedProfileRepository();
    studentLookup = new InMemoryProfilesStudentLookup();
    studentLookup.seed({ id: STUDENT_ID, batchId: "batch-a", userId: "user-1" });
    useCase = new UpdateProfileVisibilityUseCase({ publishedProfileRepository, studentLookup });

    await publishedProfileRepository.publish({
      studentProfileId: STUDENT_ID,
      content: CONTENT,
      publishedFromDraftId: "draft-1",
      publishedByUserId: "sec-1",
    });
  });

  it("allows the owning student to hide their profile", async () => {
    const updated = await useCase.execute({ actor: owner, studentId: STUDENT_ID, isPubliclyDiscoverable: false });
    expect(updated.isPubliclyDiscoverable).toBe(false);
  });

  it("allows the owning student to opt into showing CGPA", async () => {
    const updated = await useCase.execute({ actor: owner, studentId: STUDENT_ID, showCgpa: true });
    expect(updated.showCgpa).toBe(true);
  });

  it("denies a different student (not the owner)", async () => {
    await expect(
      useCase.execute({ actor: otherStudent, studentId: STUDENT_ID, isPubliclyDiscoverable: false }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies the Secretary — this is self-service only, not administrative (§7)", async () => {
    await expect(
      useCase.execute({ actor: secretary, studentId: STUDENT_ID, isPubliclyDiscoverable: false }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies an in-scope Coordinator too — same reasoning as the Secretary denial", async () => {
    await expect(
      useCase.execute({ actor: coordinatorInScope, studentId: STUDENT_ID, isPubliclyDiscoverable: false }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws StudentNotFoundError for an unknown student", async () => {
    await expect(
      useCase.execute({ actor: owner, studentId: "unknown", isPubliclyDiscoverable: false }),
    ).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it("throws PublishedProfileNotFoundError when the student has no published profile yet", async () => {
    studentLookup.seed({ id: "student-no-profile", batchId: "batch-a", userId: "user-3" });
    const noProfileOwner: AuthenticatedActor = { userId: "user-3", role: "STUDENT", studentProfileId: "student-no-profile" };
    await expect(
      useCase.execute({ actor: noProfileOwner, studentId: "student-no-profile", isPubliclyDiscoverable: false }),
    ).rejects.toBeInstanceOf(PublishedProfileNotFoundError);
  });

  it("leaves showCgpa untouched when only isPubliclyDiscoverable is provided", async () => {
    await useCase.execute({ actor: owner, studentId: STUDENT_ID, showCgpa: true });
    const updated = await useCase.execute({ actor: owner, studentId: STUDENT_ID, isPubliclyDiscoverable: false });
    expect(updated.showCgpa).toBe(true);
    expect(updated.isPubliclyDiscoverable).toBe(false);
  });
});
