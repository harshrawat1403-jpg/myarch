import { describe, expect, it } from "vitest";
import { SetTaskStatusUseCase } from "../../../src/modules/tasks/application/use-cases/set-task-status";
import { InvalidTaskStatusTransitionError, TaskNotFoundError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TaskRecord } from "../../../src/modules/tasks";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const OWNER_STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

function record(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date();
  return {
    id: "task-1",
    title: "Some task",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    ownerId: "stu-1",
    creatorId: "coord-1",
    deadline: null,
    reminderAt: null,
    escalatedAt: null,
    escalatedToId: null,
    relatedEntityType: null,
    relatedEntityId: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildContext(seed: TaskRecord = record()) {
  const taskRepository = new InMemoryTaskRepository();
  taskRepository.seed(seed);
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new SetTaskStatusUseCase({ taskRepository, notificationService, auditRecorder });
  return { useCase, taskRepository, notificationService, auditRecorder };
}

describe("SetTaskStatusUseCase — status transitions", () => {
  it("moves TODO -> IN_PROGRESS for the managing Coordinator", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", status: "IN_PROGRESS" });
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("rejects an invalid transition (TODO -> DONE)", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", status: "DONE" })).rejects.toBeInstanceOf(
      InvalidTaskStatusTransitionError,
    );
  });

  it("throws TaskNotFoundError for an unknown task", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, taskId: "unknown", status: "IN_PROGRESS" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

describe("SetTaskStatusUseCase — completion", () => {
  it("stamps completedAt when moved to DONE", async () => {
    const ctx = buildContext(record({ status: "IN_PROGRESS" }));
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", status: "DONE" });
    expect(updated.status).toBe("DONE");
    expect(updated.completedAt).not.toBeNull();
  });

  it("notifies the creator when someone else completes the task", async () => {
    const ctx = buildContext(record({ status: "IN_PROGRESS", ownerId: "stu-1", creatorId: "coord-1" }));
    await ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1", status: "DONE" });
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "coord-1", template: "TASK_COMPLETED" }),
    );
  });

  it("does not notify when the creator completes their own task", async () => {
    const ctx = buildContext(record({ status: "IN_PROGRESS", ownerId: "coord-1", creatorId: "coord-1" }));
    await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", status: "DONE" });
    expect(ctx.notificationService.sent).toHaveLength(0);
  });
});

describe("SetTaskStatusUseCase — cancellation", () => {
  it("stamps cancelledAt when moved to CANCELLED by the managing Coordinator", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", status: "CANCELLED" });
    expect(updated.status).toBe("CANCELLED");
    expect(updated.cancelledAt).not.toBeNull();
  });

  it("denies a Student from cancelling their own task", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1", status: "CANCELLED" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("SetTaskStatusUseCase — Coordinator/Student authorization boundaries", () => {
  it("allows the owning Student to move their own task forward (not CANCELLED)", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1", status: "IN_PROGRESS" });
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("denies a Student who does not own the task", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: OTHER_STUDENT, taskId: "task-1", status: "IN_PROGRESS" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Coordinator who neither owns nor created the task", async () => {
    const ctx = buildContext();
    const OTHER_COORDINATOR: AuthenticatedActor = { userId: "coord-9", role: "COORDINATOR", batchScope: [] };
    await expect(
      ctx.useCase.execute({ actor: OTHER_COORDINATOR, taskId: "task-1", status: "IN_PROGRESS" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
