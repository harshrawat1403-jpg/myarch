import { describe, expect, it } from "vitest";
import { ReopenTaskUseCase } from "../../../src/modules/tasks/application/use-cases/reopen-task";
import { TaskNotFoundError, TaskNotReopenableError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TaskRecord } from "../../../src/modules/tasks";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function record(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date();
  return {
    id: "task-1",
    title: "Some task",
    description: null,
    status: "DONE",
    priority: "MEDIUM",
    ownerId: "stu-1",
    creatorId: "coord-1",
    deadline: null,
    reminderAt: null,
    escalatedAt: null,
    escalatedToId: null,
    relatedEntityType: null,
    relatedEntityId: null,
    completedAt: now,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: TaskRecord = record()) {
  const taskRepository = new InMemoryTaskRepository();
  taskRepository.seed(seed);
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new ReopenTaskUseCase({ taskRepository, auditRecorder });
  return { useCase, taskRepository, auditRecorder };
}

describe("ReopenTaskUseCase", () => {
  it("moves a DONE task back to TODO and clears completedAt", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: SECRETARY, taskId: "task-1" });
    expect(updated.status).toBe("TODO");
    expect(updated.completedAt).toBeNull();
  });

  it("moves a CANCELLED task back to TODO and clears cancelledAt", async () => {
    const ctx = buildContext(record({ status: "CANCELLED", completedAt: null, cancelledAt: new Date() }));
    const updated = await ctx.useCase.execute({ actor: SECRETARY, taskId: "task-1" });
    expect(updated.status).toBe("TODO");
    expect(updated.cancelledAt).toBeNull();
  });

  it("rejects reopening a non-terminal task", async () => {
    const ctx = buildContext(record({ status: "IN_PROGRESS", completedAt: null }));
    await expect(ctx.useCase.execute({ actor: SECRETARY, taskId: "task-1" })).rejects.toBeInstanceOf(
      TaskNotReopenableError,
    );
  });

  it("denies a Student — reopening is a management action", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: STUDENT, taskId: "task-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies an unrelated Coordinator", async () => {
    const ctx = buildContext();
    const OTHER: AuthenticatedActor = { userId: "coord-9", role: "COORDINATOR", batchScope: [] };
    await expect(ctx.useCase.execute({ actor: OTHER, taskId: "task-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws TaskNotFoundError for an unknown task", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, taskId: "unknown" })).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("allows the Coordinator who owns/created it", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1" });
    expect(updated.status).toBe("TODO");
  });
});
