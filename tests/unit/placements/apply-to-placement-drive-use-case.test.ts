import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { ApplyToPlacementDriveUseCase } from "../../../src/modules/placements/application/use-cases/apply-to-placement-drive";
import {
  AlreadyAppliedError,
  DriveNotOpenError,
  NotEligibleForDriveError,
  PlacementDriveNotFoundError,
} from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function drive(overrides: Partial<PlacementDriveRecord> = {}): PlacementDriveRecord {
  return {
    id: "drive-a",
    companyId: "company-1",
    companyName: "Acme Architects",
    title: "Drive A",
    type: "PLACEMENT",
    eligibility: { eligibleBatchIds: ["batch-a"] },
    packageOrStipend: null,
    description: null,
    status: "ANNOUNCED",
    applicationDeadline: null,
    createdByUserId: "sec-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("ApplyToPlacementDriveUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let applicationRepository: InMemoryApplicationRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let useCase: ApplyToPlacementDriveUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    applicationRepository = new InMemoryApplicationRepository();
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    useCase = new ApplyToPlacementDriveUseCase({ placementDriveRepository, applicationRepository, studentEligibilityLookup });
  });

  it("creates an APPLIED application for an eligible student", async () => {
    placementDriveRepository.seed(drive());
    const application = await useCase.execute({ actor: student, driveId: "drive-a" });
    expect(application.currentStatus).toBe("APPLIED");
    expect(application.studentProfileId).toBe("s1");
  });

  it("rejects a DRAFT or CLOSED drive with DriveNotOpenError", async () => {
    placementDriveRepository.seed(drive({ status: "DRAFT" }));
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(DriveNotOpenError);
  });

  it("rejects a drive whose application deadline has passed", async () => {
    placementDriveRepository.seed(drive({ applicationDeadline: new Date("2020-01-01") }));
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(DriveNotOpenError);
  });

  it("rejects a student outside the drive's eligible batches", async () => {
    placementDriveRepository.seed(drive({ eligibility: { eligibleBatchIds: ["batch-b"] } }));
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(NotEligibleForDriveError);
  });

  it("rejects a student below the drive's minimum CGPA", async () => {
    placementDriveRepository.seed(drive({ eligibility: { eligibleBatchIds: ["batch-a"], minCgpa: 9.0 } }));
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(NotEligibleForDriveError);
  });

  it("rejects a student with an active backlog when the drive disallows backlogs", async () => {
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: true,
    });
    placementDriveRepository.seed(drive({ eligibility: { eligibleBatchIds: ["batch-a"], backlogAllowance: false } }));
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(NotEligibleForDriveError);
  });

  it("allows a student with an active backlog when the drive explicitly allows it", async () => {
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: true,
    });
    placementDriveRepository.seed(drive({ eligibility: { eligibleBatchIds: ["batch-a"], backlogAllowance: true } }));
    const application = await useCase.execute({ actor: student, driveId: "drive-a" });
    expect(application.currentStatus).toBe("APPLIED");
  });

  it("rejects a second application to the same drive with AlreadyAppliedError", async () => {
    placementDriveRepository.seed(drive());
    await useCase.execute({ actor: student, driveId: "drive-a" });
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(AlreadyAppliedError);
  });

  it("throws PlacementDriveNotFoundError for an unknown drive", async () => {
    await expect(useCase.execute({ actor: student, driveId: "unknown" })).rejects.toBeInstanceOf(
      PlacementDriveNotFoundError,
    );
  });

  it("denies a Secretary", async () => {
    placementDriveRepository.seed(drive());
    await expect(useCase.execute({ actor: secretary, driveId: "drive-a" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
