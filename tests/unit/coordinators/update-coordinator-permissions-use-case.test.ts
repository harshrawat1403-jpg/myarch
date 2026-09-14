import { beforeEach, describe, expect, it } from "vitest";
import { UpdateCoordinatorPermissionsUseCase } from "../../../src/modules/coordinators/application/use-cases/update-coordinator-permissions";
import {
  CoordinatorNotFoundError,
  InvalidCoordinatorPermissionError,
} from "../../../src/modules/coordinators/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function seedRecord(overrides: Partial<CoordinatorRecord> = {}): CoordinatorRecord {
  return {
    id: "target-coordinator",
    userId: "target-user",
    email: "target@myarch.in",
    fullName: "Target Coordinator",
    isActive: true,
    position: null,
    customPosition: null,
    batchIds: [],
    permissions: [],
    maintenanceRole: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildUseCase() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new UpdateCoordinatorPermissionsUseCase({ coordinatorRepository, auditRecorder });
  return { useCase, coordinatorRepository, auditRecorder };
}

describe("UpdateCoordinatorPermissionsUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
    ctx.coordinatorRepository.seed(seedRecord());
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.useCase.execute({
        actor: COORDINATOR,
        coordinatorId: "target-coordinator",
        permissions: ["maintenance.view"],
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws CoordinatorNotFoundError for an unknown id", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "no-such-id", permissions: [] }),
    ).rejects.toBeInstanceOf(CoordinatorNotFoundError);
  });

  it("rejects a key outside the canonical catalog", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        coordinatorId: "target-coordinator",
        permissions: ["not.a.real.permission"],
      }),
    ).rejects.toBeInstanceOf(InvalidCoordinatorPermissionError);
  });

  it("sets the full permission set, replacing whatever was there before", async () => {
    ctx.coordinatorRepository.seed(seedRecord({ permissions: ["maintenance.view"] }));

    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      coordinatorId: "target-coordinator",
      permissions: ["events.create", "events.manage"],
    });

    expect(result.permissions).toEqual(["events.create", "events.manage"]);
  });

  it("de-duplicates repeated keys in the input", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      coordinatorId: "target-coordinator",
      permissions: ["maintenance.view", "maintenance.view"],
    });

    expect(result.permissions).toEqual(["maintenance.view"]);
  });

  it("allows clearing every permission with an empty array", async () => {
    ctx.coordinatorRepository.seed(seedRecord({ permissions: ["maintenance.view"] }));
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      coordinatorId: "target-coordinator",
      permissions: [],
    });
    expect(result.permissions).toEqual([]);
  });

  it("records a COORDINATOR_UPDATED audit entry with the new permission set", async () => {
    await ctx.useCase.execute({
      actor: SECRETARY,
      coordinatorId: "target-coordinator",
      permissions: ["maintenance.view"],
    });

    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        actorUserId: "sec-1",
        action: "COORDINATOR_UPDATED",
        targetEntityId: "target-user",
        metadata: { permissions: ["maintenance.view"] },
      }),
    );
  });
});
