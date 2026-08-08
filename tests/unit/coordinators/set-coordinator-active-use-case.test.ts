import { beforeEach, describe, expect, it } from "vitest";
import { SetCoordinatorActiveUseCase } from "../../../src/modules/coordinators/application/use-cases/set-coordinator-active";
import {
  CoordinatorAlreadyActiveError,
  CoordinatorAlreadyDisabledError,
  CoordinatorNotFoundError,
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
    email: "target@tnparch.in",
    fullName: "Target Coordinator",
    isActive: true,
    batchIds: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function buildUseCase() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const auditRecorder = new FakeAuditRecorder();
  const revokedUserIds: string[] = [];
  const revokeUserSessions = async (userId: string) => {
    revokedUserIds.push(userId);
  };
  const useCase = new SetCoordinatorActiveUseCase({ coordinatorRepository, auditRecorder, revokeUserSessions });
  return { useCase, coordinatorRepository, auditRecorder, revokedUserIds };
}

describe("SetCoordinatorActiveUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
    ctx.coordinatorRepository.seed(seedRecord());
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, coordinatorId: "target-coordinator", isActive: false }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws CoordinatorNotFoundError for an unknown id", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "no-such-id", isActive: false }),
    ).rejects.toBeInstanceOf(CoordinatorNotFoundError);
  });

  it("disables an active coordinator", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", isActive: false });
    expect(result.isActive).toBe(false);
  });

  it("rejects disabling an already-disabled coordinator", async () => {
    ctx.coordinatorRepository.seed(seedRecord({ isActive: false }));
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", isActive: false }),
    ).rejects.toBeInstanceOf(CoordinatorAlreadyDisabledError);
  });

  it("rejects enabling an already-active coordinator", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", isActive: true }),
    ).rejects.toBeInstanceOf(CoordinatorAlreadyActiveError);
  });

  it("revokes every session when disabling, but not when enabling", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", isActive: false });
    expect(ctx.revokedUserIds).toEqual(["target-user"]);
  });

  it("records COORDINATOR_DISABLED on disable and COORDINATOR_ENABLED on enable", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", isActive: false });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "COORDINATOR_DISABLED", targetEntityId: "target-user" }),
    );

    await ctx.useCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", isActive: true });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "COORDINATOR_ENABLED", targetEntityId: "target-user" }),
    );
  });
});
