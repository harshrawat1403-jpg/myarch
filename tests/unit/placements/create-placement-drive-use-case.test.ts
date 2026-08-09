import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { DriveEligibility } from "../../../src/modules/placements/domain/entities";
import { CreatePlacementDriveUseCase } from "../../../src/modules/placements/application/use-cases/create-placement-drive";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };

const ELIGIBILITY: DriveEligibility = { eligibleBatchIds: ["batch-a"] };

describe("CreatePlacementDriveUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: CreatePlacementDriveUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seedCompanyName("company-1", "Acme Architects");
    auditRecorder = new FakeAuditRecorder();
    useCase = new CreatePlacementDriveUseCase({ placementDriveRepository, auditRecorder });
  });

  it("creates a DRAFT drive for a Secretary", async () => {
    const drive = await useCase.execute({
      actor: secretary,
      companyId: "company-1",
      title: "Campus Placement 2026",
      type: "PLACEMENT",
      eligibility: ELIGIBILITY,
    });

    expect(drive.status).toBe("DRAFT");
    expect(drive.companyName).toBe("Acme Architects");
  });

  it("allows a Coordinator scoped to the drive's eligible batches", async () => {
    const drive = await useCase.execute({
      actor: scopedCoordinator,
      companyId: "company-1",
      title: "Campus Placement 2026",
      type: "PLACEMENT",
      eligibility: ELIGIBILITY,
    });
    expect(drive.status).toBe("DRAFT");
  });

  it("denies a Coordinator with no overlapping batch scope", async () => {
    await expect(
      useCase.execute({
        actor: unscopedCoordinator,
        companyId: "company-1",
        title: "Campus Placement 2026",
        type: "PLACEMENT",
        eligibility: ELIGIBILITY,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(
      useCase.execute({
        actor: student,
        companyId: "company-1",
        title: "Campus Placement 2026",
        type: "PLACEMENT",
        eligibility: ELIGIBILITY,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("records a PLACEMENT_DRIVE_CREATED audit entry", async () => {
    const drive = await useCase.execute({
      actor: secretary,
      companyId: "company-1",
      title: "Campus Placement 2026",
      type: "PLACEMENT",
      eligibility: ELIGIBILITY,
    });
    expect(auditRecorder.entries).toHaveLength(1);
    expect(auditRecorder.entries[0]).toMatchObject({ action: "PLACEMENT_DRIVE_CREATED", targetEntityId: drive.id });
  });
});
