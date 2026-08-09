import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { GetDashboardStatsUseCase } from "../../../src/modules/recruiters/application/use-cases/get-dashboard-stats";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

function profile(overrides: Partial<RecruiterStudentProfileDTO>): RecruiterStudentProfileDTO {
  return {
    studentId: "s1",
    fullName: "Alice",
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
    ...overrides,
  };
}

describe("GetDashboardStatsUseCase", () => {
  let repo: InMemoryRecruiterDirectoryRepository;
  let useCase: GetDashboardStatsUseCase;

  beforeEach(() => {
    repo = new InMemoryRecruiterDirectoryRepository();
    useCase = new GetDashboardStatsUseCase({ directoryRepository: repo });
  });

  it("counts total available students, distinct batches, and distinct skills", async () => {
    repo.seedApproved(profile({ studentId: "s1", batchId: "batch-a", skills: ["Rendering", "Modeling"] }));
    repo.seedApproved(profile({ studentId: "s2", batchId: "batch-a", skills: ["Modeling"] }));
    repo.seedApproved(profile({ studentId: "s3", batchId: "batch-b", skills: ["Rendering", "3D Printing"] }));

    const stats = await useCase.execute({ actor: recruiter });
    expect(stats.totalAvailableStudents).toBe(3);
    expect(stats.graduationBatchesAvailable).toBe(2);
    expect(stats.skillsRepresented).toBe(3);
  });

  it("returns zeroes when no students are visible yet", async () => {
    const stats = await useCase.execute({ actor: recruiter });
    expect(stats).toEqual({ totalAvailableStudents: 0, graduationBatchesAvailable: 0, skillsRepresented: 0 });
  });

  it("denies the Secretary — recruiter-specific stats endpoint, not an admin one", async () => {
    await expect(useCase.execute({ actor: secretary })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
