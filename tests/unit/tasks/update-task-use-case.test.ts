import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { TaskNotFoundError, type TaskRecord } from "../../../src/modules/tasks";
import { UpdateTaskUseCase } from "../../../src/modules/tasks/application/use-cases/update-task";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeJobDispatcher } from "../../support/fakes/fake-job-dispatcher";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const OWNER_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: [] };
const OUTSIDER_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function record(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date();
  return {
    id: "task-1",
    title: "Original title",
    description: "Original description",
    status: "TODO",
    priority: "MEDIUM",
    ownerId: "coord-1",
    creatorId: "sec-1",
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
  const jobDispatcher = new FakeJobDispatcher();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new UpdateTaskUseCase({ taskRepository, jobDispatcher, auditRecorder });
  return { useCase, jobDispatcher, auditRecorder };
}

describe("UpdateTaskUseCase", () => {
  it("updates title, priority, and deadline for the owning Coordinator", async () => {
    const ctx = buildContext();
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await ctx.useCase.execute({
      actor: OWNER_COORDINATOR,
      taskId: "task-1",
      title: "Updated title",
      priority: "HIGH",
      deadline,
    });

    expect(updated.title).toBe("Updated title");
    expect(updated.priority).toBe("HIGH");
    expect(updated.deadline?.getTime()).toBe(deadline.getTime());
    expect(ctx.auditRecorder.entries[0]?.action).toBe("TASK_UPDATED");
  });

  it("schedules a fresh overdue-check job when the deadline changes to a future date", async () => {
    const ctx = buildContext();
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await ctx.useCase.execute({ actor: SECRETARY, taskId: "task-1", deadline });

    expect(ctx.jobDispatcher.dispatched).toHaveLength(1);
    expect(ctx.jobDispatcher.dispatched[0]?.type).toBe("TASK_OVERDUE_CHECK");
  });

  it("does not schedule a job when the deadline is left unchanged", async () => {
    const ctx = buildContext();
    await ctx.useCase.execute({ actor: SECRETARY, taskId: "task-1", title: "Only the title changes" });

    expect(ctx.jobDispatcher.dispatched).toHaveLength(0);
  });

  it("Secretary can update any task", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: SECRETARY, taskId: "task-1", title: "Secretary edit" });
    expect(updated.title).toBe("Secretary edit");
  });

  it("denies a Coordinator who neither owns nor created the task", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: OUTSIDER_COORDINATOR, taskId: "task-1", title: "Should be rejected" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student even for their own task — editing is management, not status movement", async () => {
    const ctx = buildContext(record({ ownerId: "stu-1" }));
    await expect(
      ctx.useCase.execute({ actor: STUDENT, taskId: "task-1", title: "Student cannot rename" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws TaskNotFoundError for an unknown task", async () => {
    const ctx = buildContext();
    await expect(ctx.useCase.execute({ actor: SECRETARY, taskId: "unknown", title: "x" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });
});
