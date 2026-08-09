import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { SearchPlacementDrivesUseCase } from "../../../src/modules/placements/application/use-cases/search-placement-drives";
import { GetPlacementDriveUseCase } from "../../../src/modules/placements/application/use-cases/get-placement-drive";
import { PlacementDriveNotFoundError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function drive(id: string, eligibleBatchIds: string[]): PlacementDriveRecord {
  return {
    id,
    companyId: "company-1",
    companyName: "Acme Architects",
    title: `Drive ${id}`,
    type: "PLACEMENT",
    eligibility: { eligibleBatchIds },
    packageOrStipend: null,
    description: null,
    status: "ANNOUNCED",
    applicationDeadline: null,
    createdByUserId: "sec-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("SearchPlacementDrivesUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let useCase: SearchPlacementDrivesUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(drive("drive-a", ["batch-a"]));
    placementDriveRepository.seed(drive("drive-shared", ["batch-a", "batch-b"]));
    placementDriveRepository.seed(drive("drive-b-only", ["batch-b"]));
    useCase = new SearchPlacementDrivesUseCase({ placementDriveRepository });
  });

  it("returns every drive for a Secretary", async () => {
    const results = await useCase.execute({ actor: secretary, filters: {} });
    expect(results).toHaveLength(3);
  });

  it("returns only drives overlapping the Coordinator's batch scope, including cross-batch drives", async () => {
    const results = await useCase.execute({ actor: coordinator, filters: {} });
    expect(results.map((d) => d.id).sort()).toEqual(["drive-a", "drive-shared"]);
  });

  it("denies a Recruiter", async () => {
    await expect(useCase.execute({ actor: recruiter, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("GetPlacementDriveUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let useCase: GetPlacementDriveUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(drive("drive-a", ["batch-a"]));
    placementDriveRepository.seed(drive("drive-b-only", ["batch-b"]));
    useCase = new GetPlacementDriveUseCase({ placementDriveRepository });
  });

  it("returns a drive within the Coordinator's scope", async () => {
    const result = await useCase.execute({ actor: coordinator, driveId: "drive-a" });
    expect(result.id).toBe("drive-a");
  });

  it("denies a Coordinator viewing a drive entirely outside their scope", async () => {
    await expect(useCase.execute({ actor: coordinator, driveId: "drive-b-only" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws PlacementDriveNotFoundError for an unknown drive", async () => {
    await expect(useCase.execute({ actor: secretary, driveId: "unknown" })).rejects.toBeInstanceOf(
      PlacementDriveNotFoundError,
    );
  });
});
