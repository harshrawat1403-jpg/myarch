import { beforeEach, describe, expect, it } from "vitest";
import { GetTaskUseCase } from "../../../src/modules/tasks/application/use-cases/get-task";
import { TaskNotFoundError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { InMemoryTaskCommentRepository } from "../../support/fakes/in-memory-task-comment-repository";
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

describe("GetTaskUseCase", () => {
  let taskRepository: InMemoryTaskRepository;
  let taskCommentRepository: InMemoryTaskCommentRepository;
  let useCase: GetTaskUseCase;

  beforeEach(() => {
    taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record());
    taskCommentRepository = new InMemoryTaskCommentRepository();
    useCase = new GetTaskUseCase({ taskRepository, taskCommentRepository });
  });

  it("returns the task and its comments for an authorized viewer", async () => {
    await taskCommentRepository.add("task-1", "stu-1", "hello");
    const result = await useCase.execute({ actor: OWNER_STUDENT, taskId: "task-1" });
    expect(result.task.id).toBe("task-1");
    expect(result.comments).toHaveLength(1);
  });

  it("denies a Student with no view access", async () => {
    await expect(useCase.execute({ actor: OTHER_STUDENT, taskId: "task-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws TaskNotFoundError for an unknown task", async () => {
    await expect(useCase.execute({ actor: OWNER_STUDENT, taskId: "unknown" })).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});
