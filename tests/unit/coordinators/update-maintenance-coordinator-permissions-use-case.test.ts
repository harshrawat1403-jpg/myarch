import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import {
  InvalidCoordinatorPermissionError,
  NoMaintenanceCoordinatorDesignatedError,
  type CoordinatorRecord,
} from "../../../src/modules/coordinators";
import { UpdateMaintenanceCoordinatorPermissionsUseCase } from "../../../src/modules/coordinators/application/use-cases/update-maintenance-coordinator-permissions";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const MAINTENANCE_SECRETARY: AuthenticatedActor = {
  userId: "coord-mtsec",
  role: "COORDINATOR",
  batchScope: [],
  permissions: [],
  maintenanceRole: "MAINTENANCE_SECRETARY",
};
const ORDINARY_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };

function record(overrides: Partial<CoordinatorRecord> = {}): CoordinatorRecord {
  return {
    id: overrides.id ?? "coord-mc",
    userId: overrides.userId ?? "user-mc",
    email: overrides.email ?? "coordinator@myarch.in",
    fullName: overrides.fullName ?? "Maintenance Coordinator",
    isActive: overrides.isActive ?? true,
    position: overrides.position ?? null,
    customPosition: overrides.customPosition ?? null,
    batchIds: overrides.batchIds ?? [],
    permissions: overrides.permissions ?? [],
    maintenanceRole: overrides.maintenanceRole ?? "MAINTENANCE_COORDINATOR",
    createdAt: overrides.createdAt ?? new Date(),
  };
}

function buildContext() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new UpdateMaintenanceCoordinatorPermissionsUseCase({ coordinatorRepository, auditRecorder });
  return { useCase, coordinatorRepository, auditRecorder };
}

describe("UpdateMaintenanceCoordinatorPermissionsUseCase", () => {
  it("Secretary can set the designated Maintenance Coordinator's permissions", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());

    const updated = await ctx.useCase.execute({ actor: SECRETARY, permissions: ["maintenance.view", "maintenance.tasks"] });
    expect([...updated.permissions].sort()).toEqual(["maintenance.tasks", "maintenance.view"]);
    expect(ctx.auditRecorder.entries[0]?.action).toBe("MAINTENANCE_COORDINATOR_PERMISSIONS_UPDATED");
  });

  it("a Maintenance-Secretary-flagged Coordinator can also set them", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());

    const updated = await ctx.useCase.execute({ actor: MAINTENANCE_SECRETARY, permissions: ["maintenance.resolve"] });
    expect(updated.permissions).toEqual(["maintenance.resolve"]);
  });

  it("denies an ordinary Coordinator with no Maintenance functional role", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());

    await expect(
      ctx.useCase.execute({ actor: ORDINARY_COORDINATOR, permissions: ["maintenance.view"] }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects a key outside the maintenance.* allowlist — cannot grant permissions outside Maintenance", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record());

    await expect(
      ctx.useCase.execute({ actor: SECRETARY, permissions: ["events.manage"] }),
    ).rejects.toBeInstanceOf(InvalidCoordinatorPermissionError);
  });

  it("preserves any non-maintenance permission the target separately holds, replacing only the maintenance.* subset", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ permissions: ["events.manage", "maintenance.view"] }));

    const updated = await ctx.useCase.execute({ actor: SECRETARY, permissions: ["maintenance.resolve"] });
    expect([...updated.permissions].sort()).toEqual(["events.manage", "maintenance.resolve"]);
  });

  it("throws NoMaintenanceCoordinatorDesignatedError when nobody is currently designated", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, permissions: [] })).rejects.toBeInstanceOf(
      NoMaintenanceCoordinatorDesignatedError,
    );
  });

  it("never targets a client-supplied id — always resolves the one active designated Coordinator", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-mc", maintenanceRole: "MAINTENANCE_COORDINATOR" }));
    ctx.coordinatorRepository.seed(
      record({ id: "coord-other", userId: "user-other", email: "other@myarch.in", maintenanceRole: null }),
    );

    const updated = await ctx.useCase.execute({ actor: SECRETARY, permissions: ["maintenance.view"] });
    expect(updated.id).toBe("coord-mc");
  });
});
