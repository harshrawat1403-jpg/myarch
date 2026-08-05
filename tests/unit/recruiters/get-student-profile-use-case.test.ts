import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { GetRecruiterStudentProfileUseCase } from "../../../src/modules/recruiters/application/use-cases/get-student-profile";
import { ApprovedProfileNotFoundError } from "../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

const APPROVED: RecruiterStudentProfileDTO = {
  studentId: "s1",
  fullName: "Alice Architect",
  batchId: "batch-a",
  batchName: "B.Arch 2026",
  bio: "Aspiring architect",
  skills: ["Rendering"],
  software: ["Rhino"],
  selectedProjects: [],
  portfolioLinks: [],
  certifications: [],
  internships: [],
  hasResume: true,
  profilePhotoUrl: null,
};

describe("GetRecruiterStudentProfileUseCase — privacy boundaries", () => {
  let repo: InMemoryRecruiterDirectoryRepository;
  let useCase: GetRecruiterStudentProfileUseCase;

  beforeEach(() => {
    repo = new InMemoryRecruiterDirectoryRepository();
    useCase = new GetRecruiterStudentProfileUseCase({ directoryRepository: repo });
    repo.seedApproved(APPROVED);
  });

  it("returns the approved profile for a Recruiter", async () => {
    const profile = await useCase.execute({ actor: recruiter, studentId: "s1" });
    expect(profile.fullName).toBe("Alice Architect");
  });

  it("returns only the whitelisted DTO shape (no private-profile-shaped keys)", async () => {
    const profile = await useCase.execute({ actor: recruiter, studentId: "s1" });
    const keys = Object.keys(profile);
    for (const forbidden of ["cgpa", "hasActiveBacklog", "internalRemarks", "phone", "personalEmail", "backlogDetails", "confidentialDocuments"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("denies the Secretary — this is the recruiter-only profile path, not the admin one", async () => {
    await expect(useCase.execute({ actor: secretary, studentId: "s1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Coordinator", async () => {
    await expect(useCase.execute({ actor: coordinator, studentId: "s1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, studentId: "s1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws ApprovedProfileNotFoundError for a student who was never approved (simulates DRAFT)", async () => {
    await expect(
      useCase.execute({ actor: recruiter, studentId: "student-still-drafting" }),
    ).rejects.toBeInstanceOf(ApprovedProfileNotFoundError);
  });

  it("throws ApprovedProfileNotFoundError for a student PENDING_REVIEW (not yet approved)", async () => {
    // A student mid-review has no entry in the repository at all — the
    // real PrismaRecruiterDirectoryRepository only ever populates rows
    // from StudentPublicProfile, which does not exist until approval.
    await expect(
      useCase.execute({ actor: recruiter, studentId: "student-pending-review" }),
    ).rejects.toBeInstanceOf(ApprovedProfileNotFoundError);
  });

  it("throws ApprovedProfileNotFoundError for a student in CHANGES_REQUESTED", async () => {
    await expect(
      useCase.execute({ actor: recruiter, studentId: "student-changes-requested" }),
    ).rejects.toBeInstanceOf(ApprovedProfileNotFoundError);
  });

  it("throws ApprovedProfileNotFoundError for an archived student (even if previously approved)", async () => {
    // Simulates archival: the real repository's query requires
    // studentProfile.isActive === true, so an archived student's
    // StudentPublicProfile row is excluded even though it still exists —
    // modeled here by simply not seeding it into the fake.
    await expect(
      useCase.execute({ actor: recruiter, studentId: "student-archived" }),
    ).rejects.toBeInstanceOf(ApprovedProfileNotFoundError);
  });

  it("does not distinguish 'never existed' from 'exists but not visible' in its error (no enumeration signal)", async () => {
    let unknownError: unknown;
    let draftError: unknown;
    try {
      await useCase.execute({ actor: recruiter, studentId: "totally-unknown-id" });
    } catch (err) {
      unknownError = err;
    }
    try {
      await useCase.execute({ actor: recruiter, studentId: "student-still-drafting" });
    } catch (err) {
      draftError = err;
    }
    expect(unknownError).toBeInstanceOf(ApprovedProfileNotFoundError);
    expect(draftError).toBeInstanceOf(ApprovedProfileNotFoundError);
    expect((unknownError as Error).message).toBe((draftError as Error).message);
  });
});
