import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { SetPlacementDriveStatusUseCase } from "../../../src/modules/placements/application/use-cases/set-placement-drive-status";
import { InvalidDriveStatusTransitionError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };

const ANNOUNCED_DRIVE: PlacementDriveRecord = {
  id: "drive-1",
  companyId: "company-1",
  companyName: "Acme Architects",
  title: "Campus Placement 2026",
  type: "PLACEMENT",
  eligibility: { eligibleBatchIds: ["batch-a"] },
  packageOrStipend: null,
  description: null,
  status: "ANNOUNCED",
  applicationDeadline: null,
  createdByUserId: "sec-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("SetPlacementDriveStatusUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: SetPlacementDriveStatusUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(ANNOUNCED_DRIVE);
    auditRecorder = new FakeAuditRecorder();
    useCase = new SetPlacementDriveStatusUseCase({ placementDriveRepository, auditRecorder });
  });

  it("allows a fully-scoped Coordinator to move ANNOUNCED to IN_PROGRESS (operational task, not 'publish')", async () => {
    const updated = await useCase.execute({ actor: scopedCoordinator, driveId: "drive-1", status: "IN_PROGRESS" });
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("allows a Secretary to close a drive directly from ANNOUNCED", async () => {
    const updated = await useCase.execute({ actor: secretary, driveId: "drive-1", status: "CLOSED" });
    expect(updated.status).toBe("CLOSED");
  });

  it("denies a Coordinator with no overlapping batch scope", async () => {
    await expect(
      useCase.execute({ actor: unscopedCoordinator, driveId: "drive-1", status: "IN_PROGRESS" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects an invalid transition (e.g. back to DRAFT)", async () => {
    await expect(
      useCase.execute({ actor: secretary, driveId: "drive-1", status: "DRAFT" }),
    ).rejects.toBeInstanceOf(InvalidDriveStatusTransitionError);
  });
});
