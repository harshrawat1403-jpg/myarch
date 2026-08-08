import { beforeEach, describe, expect, it } from "vitest";
import { AcademicYearTransitionJobHandler } from "../../../src/modules/academic-year/infrastructure/academic-year-transition-job-handler";
import { InMemoryAcademicYearTransitionRunRepository } from "../../support/fakes/in-memory-academic-year-transition-run-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TransitionPlan } from "../../../src/modules/academic-year";
import type { Batch } from "../../../src/modules/batches";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";

function buildHandler() {
  const runRepository = new InMemoryAcademicYearTransitionRunRepository();
  const auditRecorder = new FakeAuditRecorder();
  const graduatedBatchIds: string[] = [];
  const archivedBatchIds: string[] = [];
  const createdBatches: { name: string; year: number }[] = [];
  const assignedPairs: { coordinatorId: string; batchId: string }[] = [];

  let shouldFailCreateBatch = false;
  let failingGraduateBatchId: string | null = null;
  let failingAssignCoordinatorId: string | null = null;

  const handler = new AcademicYearTransitionJobHandler({
    runRepository,
    auditRecorder,
    createBatch: async (input) => {
      if (shouldFailCreateBatch) throw new Error("Batch name already exists");
      createdBatches.push({ name: input.name, year: input.year });
      return { id: "new-batch-1", name: input.name, year: input.year, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() } as Batch;
    },
    updateBatchStatus: async (input) => {
      if (input.batchId === failingGraduateBatchId) throw new Error("Not authorized to change batch lifecycle status");
      if (input.status === "GRADUATED") graduatedBatchIds.push(input.batchId);
      if (input.status === "ARCHIVED") archivedBatchIds.push(input.batchId);
      return { id: input.batchId, name: "x", year: 2020, status: input.status, createdAt: new Date(), updatedAt: new Date() } as Batch;
    },
    assignBatch: async (input) => {
      if (input.coordinatorId === failingAssignCoordinatorId) throw new Error("Batch already assigned");
      assignedPairs.push({ coordinatorId: input.coordinatorId, batchId: input.batchId });
      return { id: input.coordinatorId, userId: "u", email: "x@x.com", fullName: "x", isActive: true, batchIds: [input.batchId], createdAt: new Date() } as CoordinatorRecord;
    },
  });

  return {
    handler,
    runRepository,
    auditRecorder,
    graduatedBatchIds,
    archivedBatchIds,
    createdBatches,
    assignedPairs,
    setShouldFailCreateBatch: (value: boolean) => (shouldFailCreateBatch = value),
    setFailingGraduateBatchId: (value: string | null) => (failingGraduateBatchId = value),
    setFailingAssignCoordinatorId: (value: string | null) => (failingAssignCoordinatorId = value),
  };
}

function plan(overrides: Partial<TransitionPlan> = {}): TransitionPlan {
  return {
    graduations: [{ batchId: "b1", batchName: "B.Arch 2021", fromStatus: "ACTIVE", toStatus: "GRADUATED" }],
    archivals: [{ batchId: "b0", batchName: "B.Arch 2016", fromStatus: "GRADUATED", toStatus: "ARCHIVED" }],
    newIntake: { name: "B.Arch 2026", year: 2026 },
    coordinatorAssignments: [{ coordinatorId: "coord-a", coordinatorName: "Alice Coordinator" }],
    ...overrides,
  };
}

describe("AcademicYearTransitionJobHandler", () => {
  let ctx: ReturnType<typeof buildHandler>;

  beforeEach(() => {
    ctx = buildHandler();
  });

  it("executes every step in order and marks the run COMPLETED when everything succeeds", async () => {
    const run = await ctx.runRepository.create({ actorUserId: "sec-1", plan: plan() });

    await ctx.handler.handle({ runId: run.id });

    expect(ctx.graduatedBatchIds).toEqual(["b1"]);
    expect(ctx.archivedBatchIds).toEqual(["b0"]);
    expect(ctx.createdBatches).toEqual([{ name: "B.Arch 2026", year: 2026 }]);
    expect(ctx.assignedPairs).toEqual([{ coordinatorId: "coord-a", batchId: "new-batch-1" }]);

    const finalRun = await ctx.runRepository.findById(run.id);
    expect(finalRun?.status).toBe("COMPLETED");
    expect(finalRun?.stepLog).toHaveLength(4);
    expect(finalRun?.stepLog.every((e) => e.status === "COMPLETED")).toBe(true);

    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        action: "ACADEMIC_YEAR_TRANSITION_COMPLETED",
        targetEntityId: run.id,
        metadata: expect.objectContaining({ status: "COMPLETED", hasFailure: false }),
      }),
    );
  });

  it("logs a failed graduation step but still proceeds through remaining steps, and marks the run FAILED", async () => {
    ctx.setFailingGraduateBatchId("b1");
    const run = await ctx.runRepository.create({ actorUserId: "sec-1", plan: plan() });

    await ctx.handler.handle({ runId: run.id });

    expect(ctx.graduatedBatchIds).toEqual([]);
    expect(ctx.archivedBatchIds).toEqual(["b0"]); // archival still ran
    expect(ctx.createdBatches).toHaveLength(1); // new batch still created
    expect(ctx.assignedPairs).toHaveLength(1); // coordinator still assigned

    const finalRun = await ctx.runRepository.findById(run.id);
    expect(finalRun?.status).toBe("FAILED");
    const graduateEntry = finalRun?.stepLog.find((e) => e.step.startsWith("Graduate"));
    expect(graduateEntry?.status).toBe("FAILED");
  });

  it("skips coordinator assignment (as a failed step) when batch creation fails", async () => {
    ctx.setShouldFailCreateBatch(true);
    const run = await ctx.runRepository.create({ actorUserId: "sec-1", plan: plan() });

    await ctx.handler.handle({ runId: run.id });

    expect(ctx.assignedPairs).toEqual([]);
    const finalRun = await ctx.runRepository.findById(run.id);
    expect(finalRun?.status).toBe("FAILED");
    const assignEntry = finalRun?.stepLog.find((e) => e.step === "Assign coordinators");
    expect(assignEntry?.status).toBe("FAILED");
    expect(assignEntry?.detail).toContain("Skipped");
  });

  it("logs a failed coordinator-assignment step without failing the others", async () => {
    ctx.setFailingAssignCoordinatorId("coord-a");
    const run = await ctx.runRepository.create({ actorUserId: "sec-1", plan: plan() });

    await ctx.handler.handle({ runId: run.id });

    const finalRun = await ctx.runRepository.findById(run.id);
    expect(finalRun?.status).toBe("FAILED");
    expect(ctx.graduatedBatchIds).toEqual(["b1"]);
    expect(ctx.archivedBatchIds).toEqual(["b0"]);
  });

  it("does nothing if the run no longer exists", async () => {
    await expect(ctx.handler.handle({ runId: "missing" })).resolves.toBeUndefined();
  });

  it("onPermanentFailure marks the run FAILED with the error message", async () => {
    const run = await ctx.runRepository.create({ actorUserId: "sec-1", plan: plan() });
    await ctx.handler.onPermanentFailure({ runId: run.id }, new Error("catastrophic failure"));
    const finalRun = await ctx.runRepository.findById(run.id);
    expect(finalRun?.status).toBe("FAILED");
    expect(finalRun?.errorMessage).toBe("catastrophic failure");
  });
});
