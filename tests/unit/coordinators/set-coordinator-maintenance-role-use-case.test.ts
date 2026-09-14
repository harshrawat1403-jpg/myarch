import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import {
  CoordinatorNotFoundError,
  InactiveCoordinatorError,
  MaxActiveMaintenanceRoleError,
  type CoordinatorRecord,
} from "../../../src/modules/coordinators";
import { SetCoordinatorMaintenanceRoleUseCase } from "../../../src/modules/coordinators/application/use-cases/set-coordinator-maintenance-role";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR_ACTOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };

function record(overrides: Partial<CoordinatorRecord> = {}): CoordinatorRecord {
  return {
    id: overrides.id ?? "coord-1",
    userId: overrides.userId ?? "user-1",
    email: overrides.email ?? "alice@myarch.in",
    fullName: overrides.fullName ?? "Alice Coordinator",
    isActive: overrides.isActive ?? true,
    position: overrides.position ?? null,
    customPosition: overrides.customPosition ?? null,
    batchIds: overrides.batchIds ?? [],
    permissions: overrides.permissions ?? [],
    maintenanceRole: overrides.maintenanceRole ?? null,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

function buildContext() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new SetCoordinatorMaintenanceRoleUseCase({ coordinatorRepository, auditRecorder });
  return { useCase, coordinatorRepository, auditRecorder };
}

describe("SetCoordinatorMaintenanceRoleUseCase", () => {
  it("designates a Coordinator MAINTENANCE_SECRETARY", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1" }));

    const updated = await ctx.useCase.execute({
      actor: SECRETARY,
      coordinatorId: "coord-1",
      maintenanceRole: "MAINTENANCE_SECRETARY",
    });

    expect(updated.maintenanceRole).toBe("MAINTENANCE_SECRETARY");
    expect(ctx.auditRecorder.entries[0]?.action).toBe("COORDINATOR_MAINTENANCE_ROLE_SET");
  });

  it("clears a designation by passing null", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1", maintenanceRole: "MAINTENANCE_COORDINATOR" }));

    const updated = await ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "coord-1", maintenanceRole: null });
    expect(updated.maintenanceRole).toBeNull();
  });

  it("rejects a second active MAINTENANCE_SECRETARY", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1", maintenanceRole: "MAINTENANCE_SECRETARY" }));
    ctx.coordinatorRepository.seed(record({ id: "coord-2", userId: "user-2", email: "bob@myarch.in" }));

    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "coord-2", maintenanceRole: "MAINTENANCE_SECRETARY" }),
    ).rejects.toBeInstanceOf(MaxActiveMaintenanceRoleError);
  });

  it("rejects a second active MAINTENANCE_COORDINATOR independently of the MAINTENANCE_SECRETARY cap", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1", maintenanceRole: "MAINTENANCE_COORDINATOR" }));
    ctx.coordinatorRepository.seed(record({ id: "coord-2", userId: "user-2", email: "bob@myarch.in" }));

    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "coord-2", maintenanceRole: "MAINTENANCE_COORDINATOR" }),
    ).rejects.toBeInstanceOf(MaxActiveMaintenanceRoleError);
  });

  it("re-saving the same designation on the same Coordinator does not trip the cap (excluded from its own count)", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1", maintenanceRole: "MAINTENANCE_SECRETARY" }));

    const updated = await ctx.useCase.execute({
      actor: SECRETARY,
      coordinatorId: "coord-1",
      maintenanceRole: "MAINTENANCE_SECRETARY",
    });
    expect(updated.maintenanceRole).toBe("MAINTENANCE_SECRETARY");
  });

  it("rejects designating an inactive Coordinator", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1", isActive: false }));

    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "coord-1", maintenanceRole: "MAINTENANCE_SECRETARY" }),
    ).rejects.toBeInstanceOf(InactiveCoordinatorError);
  });

  it("clearing an inactive Coordinator's designation is still allowed (null never needs the active check)", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1", isActive: false, maintenanceRole: "MAINTENANCE_COORDINATOR" }));

    const updated = await ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "coord-1", maintenanceRole: null });
    expect(updated.maintenanceRole).toBeNull();
  });

  it("denies a Coordinator actor — only Secretary may designate", async () => {
    const ctx = buildContext();
    ctx.coordinatorRepository.seed(record({ id: "coord-1" }));

    await expect(
      ctx.useCase.execute({ actor: COORDINATOR_ACTOR, coordinatorId: "coord-1", maintenanceRole: "MAINTENANCE_SECRETARY" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws CoordinatorNotFoundError for an unknown coordinator", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "unknown", maintenanceRole: "MAINTENANCE_SECRETARY" }),
    ).rejects.toBeInstanceOf(CoordinatorNotFoundError);
  });
});
