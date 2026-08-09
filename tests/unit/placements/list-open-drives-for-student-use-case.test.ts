import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { ListOpenDrivesForStudentUseCase } from "../../../src/modules/placements/application/use-cases/list-open-drives-for-student";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function drive(id: string, overrides: Partial<PlacementDriveRecord> = {}): PlacementDriveRecord {
  return {
    id,
    companyId: "company-1",
    companyName: "Acme Architects",
    title: `Drive ${id}`,
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

describe("ListOpenDrivesForStudentUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let applicationRepository: InMemoryApplicationRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let useCase: ListOpenDrivesForStudentUseCase;

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
    useCase = new ListOpenDrivesForStudentUseCase({ placementDriveRepository, applicationRepository, studentEligibilityLookup });
  });

  it("shows an ANNOUNCED drive eligible for the student's batch", async () => {
    placementDriveRepository.seed(drive("drive-a"));
    const results = await useCase.execute(student);
    expect(results.map((d) => d.driveId)).toEqual(["drive-a"]);
    expect(results[0]!.hasApplied).toBe(false);
  });

  it("shows a drive with no eligibleBatchIds restriction (open to every batch)", async () => {
    placementDriveRepository.seed(drive("drive-open", { eligibility: { eligibleBatchIds: [] } }));
    const results = await useCase.execute(student);
    expect(results.map((d) => d.driveId)).toEqual(["drive-open"]);
  });

  it("hides a drive not eligible for the student's batch", async () => {
    placementDriveRepository.seed(drive("drive-b", { eligibility: { eligibleBatchIds: ["batch-b"] } }));
    const results = await useCase.execute(student);
    expect(results).toEqual([]);
  });

  it("hides a DRAFT or CLOSED drive", async () => {
    placementDriveRepository.seed(drive("drive-draft", { status: "DRAFT" }));
    placementDriveRepository.seed(drive("drive-closed", { status: "CLOSED" }));
    const results = await useCase.execute(student);
    expect(results).toEqual([]);
  });

  it("hides a drive whose application deadline has already passed", async () => {
    placementDriveRepository.seed(drive("drive-expired", { applicationDeadline: new Date("2020-01-01") }));
    const results = await useCase.execute(student);
    expect(results).toEqual([]);
  });

  it("marks hasApplied/applicationStatus when the student already has an application", async () => {
    placementDriveRepository.seed(drive("drive-a"));
    await applicationRepository.create("s1", "drive-a");
    const results = await useCase.execute(student);
    expect(results[0]).toMatchObject({ hasApplied: true, applicationStatus: "APPLIED" });
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
