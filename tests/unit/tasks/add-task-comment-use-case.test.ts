import { beforeEach, describe, expect, it } from "vitest";
import { AddTaskCommentUseCase } from "../../../src/modules/tasks/application/use-cases/add-task-comment";
import { TaskCommentBodyRequiredError, TaskNotFoundError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { InMemoryTaskCommentRepository } from "../../support/fakes/in-memory-task-comment-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TaskRecord } from "../../../src/modules/tasks";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const OWNER_STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };

function record(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date();
  return {
    id: "task-1",
    title: "Task",
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

function buildContext() {
  const taskRepository = new InMemoryTaskRepository();
  taskRepository.seed(record());
  const taskCommentRepository = new InMemoryTaskCommentRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new AddTaskCommentUseCase({ taskRepository, taskCommentRepository, auditRecorder });
  return { useCase, taskCommentRepository, auditRecorder };
}

describe("AddTaskCommentUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("lets the owning Student comment on their own task", async () => {
    const comment = await ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1", body: "Working on it" });
    expect(comment.body).toBe("Working on it");
  });

  it("denies a Student with no view access to the task", async () => {
    await expect(
      ctx.useCase.execute({ actor: OTHER_STUDENT, taskId: "task-1", body: "x" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects a whitespace-only body", async () => {
    await expect(
      ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1", body: "   " }),
    ).rejects.toBeInstanceOf(TaskCommentBodyRequiredError);
  });

  it("throws TaskNotFoundError for an unknown task", async () => {
    await expect(
      ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "unknown", body: "x" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("records a TASK_COMMENT_ADDED audit entry", async () => {
    await ctx.useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1", body: "x" });
    expect(ctx.auditRecorder.entries).toContainEqual(expect.objectContaining({ action: "TASK_COMMENT_ADDED" }));
  });
});
