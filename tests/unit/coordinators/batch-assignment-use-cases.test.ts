import { beforeEach, describe, expect, it } from "vitest";
import { AssignBatchUseCase } from "../../../src/modules/coordinators/application/use-cases/assign-batch";
import { RemoveBatchUseCase } from "../../../src/modules/coordinators/application/use-cases/remove-batch";
import {
  BatchAlreadyAssignedError,
  BatchNotAssignedError,
  BatchNotFoundError,
  CoordinatorNotFoundError,
} from "../../../src/modules/coordinators/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
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

function buildContext() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const batchLookup = new InMemoryBatchLookup();
  const auditRecorder = new FakeAuditRecorder();
  const assignBatchUseCase = new AssignBatchUseCase({ coordinatorRepository, batchLookup, auditRecorder });
  const removeBatchUseCase = new RemoveBatchUseCase({ coordinatorRepository, auditRecorder });
  return { coordinatorRepository, batchLookup, auditRecorder, assignBatchUseCase, removeBatchUseCase };
}

describe("AssignBatchUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
    ctx.coordinatorRepository.seed(seedRecord());
    ctx.batchLookup.seed("batch-a", "ACTIVE");
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.assignBatchUseCase.execute({ actor: COORDINATOR, coordinatorId: "target-coordinator", batchId: "batch-a" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws CoordinatorNotFoundError for an unknown coordinator", async () => {
    await expect(
      ctx.assignBatchUseCase.execute({ actor: SECRETARY, coordinatorId: "no-such-id", batchId: "batch-a" }),
    ).rejects.toBeInstanceOf(CoordinatorNotFoundError);
  });

  it("throws BatchNotFoundError for an unknown batch", async () => {
    await expect(
      ctx.assignBatchUseCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", batchId: "no-such-batch" }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });

  it("assigns a batch successfully", async () => {
    const result = await ctx.assignBatchUseCase.execute({
      actor: SECRETARY,
      coordinatorId: "target-coordinator",
      batchId: "batch-a",
    });
    expect(result.batchIds).toContain("batch-a");
  });

  it("rejects assigning an already-assigned batch", async () => {
    ctx.coordinatorRepository.seed(seedRecord({ batchIds: ["batch-a"] }));
    await expect(
      ctx.assignBatchUseCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", batchId: "batch-a" }),
    ).rejects.toBeInstanceOf(BatchAlreadyAssignedError);
  });

  it("records a COORDINATOR_BATCH_ASSIGNED audit entry", async () => {
    await ctx.assignBatchUseCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", batchId: "batch-a" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "COORDINATOR_BATCH_ASSIGNED", targetEntityId: "target-user" }),
    );
  });
});

describe("RemoveBatchUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
    ctx.coordinatorRepository.seed(seedRecord({ batchIds: ["batch-a"] }));
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.removeBatchUseCase.execute({ actor: COORDINATOR, coordinatorId: "target-coordinator", batchId: "batch-a" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("removes an assigned batch", async () => {
    const result = await ctx.removeBatchUseCase.execute({
      actor: SECRETARY,
      coordinatorId: "target-coordinator",
      batchId: "batch-a",
    });
    expect(result.batchIds).not.toContain("batch-a");
  });

  it("rejects removing a batch that isn't assigned", async () => {
    await expect(
      ctx.removeBatchUseCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", batchId: "batch-b" }),
    ).rejects.toBeInstanceOf(BatchNotAssignedError);
  });

  it("records a COORDINATOR_BATCH_REMOVED audit entry", async () => {
    await ctx.removeBatchUseCase.execute({ actor: SECRETARY, coordinatorId: "target-coordinator", batchId: "batch-a" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "COORDINATOR_BATCH_REMOVED", targetEntityId: "target-user" }),
    );
  });
});
