import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetApplicationUseCase } from "../../../src/modules/placements/application/use-cases/get-application";
import { ApplicationNotFoundError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const owner: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("GetApplicationUseCase", () => {
  let applicationRepository: InMemoryApplicationRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let useCase: GetApplicationUseCase;

  beforeEach(() => {
    applicationRepository = new InMemoryApplicationRepository();
    applicationRepository.seed({
      id: "app-1",
      studentProfileId: "s1",
      placementDriveId: "drive-a",
      currentStatus: "APPLIED",
      currentRound: null,
      interviewScheduledAt: null,
      interviewMode: null,
      appliedAt: new Date(),
      updatedAt: new Date(),
    });
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    useCase = new GetApplicationUseCase({ applicationRepository, studentEligibilityLookup });
  });

  it("allows the owning Student", async () => {
    const result = await useCase.execute({ actor: owner, applicationId: "app-1" });
    expect(result.id).toBe("app-1");
  });

  it("denies another Student", async () => {
    await expect(useCase.execute({ actor: otherStudent, applicationId: "app-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("allows a Secretary", async () => {
    const result = await useCase.execute({ actor: secretary, applicationId: "app-1" });
    expect(result.id).toBe("app-1");
  });

  it("allows a Coordinator scoped to the applicant's batch", async () => {
    const result = await useCase.execute({ actor: scopedCoordinator, applicationId: "app-1" });
    expect(result.id).toBe("app-1");
  });

  it("denies a Coordinator not scoped to the applicant's batch", async () => {
    await expect(useCase.execute({ actor: unscopedCoordinator, applicationId: "app-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter, applicationId: "app-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws ApplicationNotFoundError for an unknown application", async () => {
    await expect(useCase.execute({ actor: secretary, applicationId: "unknown" })).rejects.toBeInstanceOf(
      ApplicationNotFoundError,
    );
  });
});
