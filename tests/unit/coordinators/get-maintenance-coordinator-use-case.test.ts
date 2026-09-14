import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";
import { GetMaintenanceCoordinatorUseCase } from "../../../src/modules/coordinators/application/use-cases/get-maintenance-coordinator";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const MAINTENANCE_SECRETARY: AuthenticatedActor = {
  userId: "coord-mtsec",
  role: "COORDINATOR",
  batchScope: [],
  permissions: [],
  maintenanceRole: "MAINTENANCE_SECRETARY",
};
const MAINTENANCE_COORDINATOR_ACTOR: AuthenticatedActor = {
  userId: "user-mc",
  role: "COORDINATOR",
  batchScope: [],
  permissions: [],
  maintenanceRole: "MAINTENANCE_COORDINATOR",
};
const ORDINARY_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function record(): CoordinatorRecord {
  return {
    id: "coord-mc",
    userId: "user-mc",
    email: "coordinator@myarch.in",
    fullName: "Maintenance Coordinator",
    isActive: true,
    position: null,
    customPosition: null,
    batchIds: [],
    permissions: ["maintenance.view"],
    maintenanceRole: "MAINTENANCE_COORDINATOR",
    createdAt: new Date(),
  };
}

function buildContext() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const useCase = new GetMaintenanceCoordinatorUseCase({ coordinatorRepository });
  return { useCase, coordinatorRepository };
}

describe("GetMaintenanceCoordinatorUseCase", () => {
  it("Secretary can view", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());
    expect(await ctx.useCase.execute({ actor: SECRETARY })).not.toBeNull();
  });

  it("a Maintenance Secretary can view", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());
    expect(await ctx.useCase.execute({ actor: MAINTENANCE_SECRETARY })).not.toBeNull();
  });

  it("the designated Maintenance Coordinator can view their own record", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());
    const result = await ctx.useCase.execute({ actor: MAINTENANCE_COORDINATOR_ACTOR });
    expect(result?.userId).toBe("user-mc");
  });

  it("returns null when nobody is currently designated", async () => {
    const ctx = buildContext();
    expect(await ctx.useCase.execute({ actor: SECRETARY })).toBeNull();
  });

  it("denies an ordinary Coordinator or a Student", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());
    await expect(ctx.useCase.execute({ actor: ORDINARY_COORDINATOR })).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(ctx.useCase.execute({ actor: STUDENT })).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
