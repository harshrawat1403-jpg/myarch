import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { ListMyApplicationsUseCase } from "../../../src/modules/placements/application/use-cases/list-my-applications";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";

const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

const DRIVE: PlacementDriveRecord = {
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
};

describe("ListMyApplicationsUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let applicationRepository: InMemoryApplicationRepository;
  let useCase: ListMyApplicationsUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(DRIVE);
    applicationRepository = new InMemoryApplicationRepository();
    useCase = new ListMyApplicationsUseCase({ applicationRepository, placementDriveRepository });
  });

  it("returns the student's own applications joined with the drive's display fields", async () => {
    await applicationRepository.create("s1", "drive-a");
    const result = await useCase.execute(student);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ companyName: "Acme Architects", title: "Drive A", currentStatus: "APPLIED" });
  });

  it("never returns another student's applications", async () => {
    await applicationRepository.create("s2", "drive-a");
    const result = await useCase.execute(student);
    expect(result).toEqual([]);
  });

  it("denies a Secretary", async () => {
    await expect(useCase.execute(secretary)).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
