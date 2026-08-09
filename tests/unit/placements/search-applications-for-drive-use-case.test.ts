import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { SearchApplicationsForDriveUseCase } from "../../../src/modules/placements/application/use-cases/search-applications-for-drive";
import { PlacementDriveNotFoundError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

const DRIVE: PlacementDriveRecord = {
  id: "drive-a",
  companyId: "company-1",
  companyName: "Acme Architects",
  title: "Drive A",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["batch-a", "batch-b"] },
  packageOrStipend: null,
  description: null,
  status: "ANNOUNCED",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("SearchApplicationsForDriveUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let applicationRepository: InMemoryApplicationRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let useCase: SearchApplicationsForDriveUseCase;

  beforeEach(async () => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(DRIVE);
    applicationRepository = new InMemoryApplicationRepository();
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Student One",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    studentEligibilityLookup.seed("s2", {
      userId: "user-batch-b",
      batchId: "batch-b",
      batchName: "B.Arch 2025",
      fullName: "Student Two",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    await applicationRepository.create("s1", "drive-a");
    await applicationRepository.create("s2", "drive-a");
    useCase = new SearchApplicationsForDriveUseCase({ applicationRepository, placementDriveRepository, studentEligibilityLookup });
  });

  it("returns every application for a Secretary, even across multiple batches", async () => {
    const results = await useCase.execute({ actor: secretary, driveId: "drive-a" });
    expect(results).toHaveLength(2);
  });

  it("joins each row with the applying student's name and batch (V4.0 D3)", async () => {
    const results = await useCase.execute({ actor: secretary, driveId: "drive-a" });
    const row = results.find((r) => r.studentProfileId === "s1");
    expect(row).toMatchObject({ studentName: "Student One", batchName: "B.Arch 2026", currentStatus: "APPLIED" });
  });

  it("filters to only applications from students within a Coordinator's batch scope", async () => {
    const results = await useCase.execute({ actor: scopedCoordinator, driveId: "drive-a" });
    expect(results.map((a) => a.studentProfileId)).toEqual(["s1"]);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, driveId: "drive-a" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws PlacementDriveNotFoundError for an unknown drive", async () => {
    await expect(useCase.execute({ actor: secretary, driveId: "unknown" })).rejects.toBeInstanceOf(
      PlacementDriveNotFoundError,
    );
  });
});
