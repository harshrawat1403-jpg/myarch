import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { ApplicationRecord, PlacementDriveRecord } from "../../../src/modules/placements/domain/entities";
import { WithdrawApplicationUseCase } from "../../../src/modules/placements/application/use-cases/withdraw-application";
import { ApplicationNotFoundError, InvalidApplicationStatusTransitionError } from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPlacementDriveRepository } from "../../support/fakes/in-memory-placement-drive-repository";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";

const owner: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };

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

function application(overrides: Partial<ApplicationRecord> = {}): ApplicationRecord {
  return {
    id: "app-1",
    studentProfileId: "s1",
    placementDriveId: "drive-a",
    currentStatus: "APPLIED",
    currentRound: null,
    interviewScheduledAt: null,
    interviewMode: null,
    appliedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("WithdrawApplicationUseCase", () => {
  let placementDriveRepository: InMemoryPlacementDriveRepository;
  let applicationRepository: InMemoryApplicationRepository;
  let useCase: WithdrawApplicationUseCase;

  beforeEach(() => {
    placementDriveRepository = new InMemoryPlacementDriveRepository();
    placementDriveRepository.seed(DRIVE);
    applicationRepository = new InMemoryApplicationRepository();
    useCase = new WithdrawApplicationUseCase({ applicationRepository, placementDriveRepository });
  });

  it("withdraws the owner's own APPLIED application", async () => {
    applicationRepository.seed(application());
    const result = await useCase.execute({ actor: owner, applicationId: "app-1" });
    expect(result.currentStatus).toBe("WITHDRAWN");
  });

  it("denies withdrawing another student's application", async () => {
    applicationRepository.seed(application());
    await expect(useCase.execute({ actor: otherStudent, applicationId: "app-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("rejects withdrawing an application already in a terminal state", async () => {
    applicationRepository.seed(application({ currentStatus: "REJECTED" }));
    await expect(useCase.execute({ actor: owner, applicationId: "app-1" })).rejects.toBeInstanceOf(
      InvalidApplicationStatusTransitionError,
    );
  });

  it("throws ApplicationNotFoundError for an unknown application", async () => {
    await expect(useCase.execute({ actor: owner, applicationId: "unknown" })).rejects.toBeInstanceOf(
      ApplicationNotFoundError,
    );
  });
});
