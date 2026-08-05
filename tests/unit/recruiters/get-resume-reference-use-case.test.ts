import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { GetResumeReferenceUseCase } from "../../../src/modules/recruiters/application/use-cases/get-resume-reference";
import { ApprovedProfileNotFoundError, ResumeNotAvailableError } from "../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };

const APPROVED_WITH_RESUME: RecruiterStudentProfileDTO = {
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
  hasResume: true,
  profilePhotoUrl: null,
};

const APPROVED_NO_RESUME: RecruiterStudentProfileDTO = { ...APPROVED_WITH_RESUME, studentId: "s2", hasResume: false };

describe("GetResumeReferenceUseCase — 'ONLY the approved public resume, never confidential documents'", () => {
  let repo: InMemoryRecruiterDirectoryRepository;
  let useCase: GetResumeReferenceUseCase;

  beforeEach(() => {
    repo = new InMemoryRecruiterDirectoryRepository();
    useCase = new GetResumeReferenceUseCase({ directoryRepository: repo });
    repo.seedApproved(APPROVED_WITH_RESUME);
    repo.seedApproved(APPROVED_NO_RESUME);
    repo.seedResume("s1", { storageKey: "resumes/s1.pdf", mimeType: "application/pdf" });
  });

  it("returns the resume reference for a Recruiter when one exists", async () => {
    const reference = await useCase.execute({ actor: recruiter, studentId: "s1" });
    expect(reference).toEqual({ storageKey: "resumes/s1.pdf", mimeType: "application/pdf" });
  });

  it("returns only storageKey/mimeType — never a confidential-document-shaped field", async () => {
    const reference = await useCase.execute({ actor: recruiter, studentId: "s1" });
    expect(Object.keys(reference).sort()).toEqual(["mimeType", "storageKey"]);
  });

  it("throws ResumeNotAvailableError when the approved profile has no resume", async () => {
    await expect(useCase.execute({ actor: recruiter, studentId: "s2" })).rejects.toBeInstanceOf(
      ResumeNotAvailableError,
    );
  });

  it("throws ApprovedProfileNotFoundError for a student with no approved profile (draft/pending/archived)", async () => {
    await expect(useCase.execute({ actor: recruiter, studentId: "unknown" })).rejects.toBeInstanceOf(
      ApprovedProfileNotFoundError,
    );
  });

  it("denies the Secretary", async () => {
    await expect(useCase.execute({ actor: secretary, studentId: "s1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Coordinator", async () => {
    await expect(useCase.execute({ actor: coordinator, studentId: "s1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
});
