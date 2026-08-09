import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { UpdatePlacementDriveUseCase } from "../../../src/modules/placements/application/use-cases/update-placement-drive";
import { PlacementDriveNotFoundError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };

const DRIVE: PlacementDriveRecord = {
  id: "drive-1",
  companyId: "company-1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["batch-a"] },
  packageOrStipend: null,
  description: null,
  status: "DRAFT",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UpdatePlacementDriveUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: UpdatePlacementDriveUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(DRIVE);
    auditRecorder = new FakeAuditRecorder();
    useCase = new UpdatePlacementDriveUseCase({ placementDriveRepository, auditRecorder });
  });

  it("updates fields for a Secretary", async () => {
    const updated = await useCase.execute({ actor: secretary, driveId: "drive-1", data: { title: "Updated Title" } });
    expect(updated.title).toBe("Updated Title");
  });

  it("allows a Coordinator scoped to the drive's current eligible batches", async () => {
    const updated = await useCase.execute({
      actor: scopedCoordinator,
      driveId: "drive-1",
      data: { description: "New description" },
    });
    expect(updated.description).toBe("New description");
  });

  it("denies a Coordinator with no overlapping batch scope", async () => {
    await expect(
      useCase.execute({ actor: unscopedCoordinator, driveId: "drive-1", data: { title: "x" } }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a scoped Coordinator trying to move the drive's eligibility entirely outside their scope", async () => {
    await expect(
      useCase.execute({
        actor: scopedCoordinator,
        driveId: "drive-1",
        data: { eligibility: { eligibleBatchIds: ["batch-z"] } },
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws PlacementDriveNotFoundError for an unknown drive", async () => {
    await expect(
      useCase.execute({ actor: secretary, driveId: "unknown", data: { title: "x" } }),
    ).rejects.toBeInstanceOf(PlacementDriveNotFoundError);
  });
});
