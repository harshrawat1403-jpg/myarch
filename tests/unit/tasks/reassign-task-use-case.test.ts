import { beforeEach, describe, expect, it } from "vitest";
import { ReassignTaskUseCase } from "../../../src/modules/tasks/application/use-cases/reassign-task";
import { CannotAssignTaskToRoleError, TaskNotFoundError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeUserRoleLookup } from "../../support/fakes/fake-user-role-lookup";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TaskRecord } from "../../../src/modules/tasks";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const OTHER_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };

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

function buildContext() {
  const taskRepository = new InMemoryTaskRepository();
  taskRepository.seed(record());
  const userRoleLookup = new FakeUserRoleLookup();
  userRoleLookup.seed("stu-1", "STUDENT");
  userRoleLookup.seed("stu-2", "STUDENT");
  userRoleLookup.seed("sec-1", "SECRETARY");
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();

  const useCase = new ReassignTaskUseCase({ taskRepository, userRoleLookup, notificationService, auditRecorder });
  return { useCase, taskRepository, notificationService, auditRecorder };
}

describe("ReassignTaskUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("reassigns to a new owner", async () => {
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", newOwnerId: "stu-2" });
    expect(updated.ownerId).toBe("stu-2");
  });

  it("denies a Coordinator who neither owns nor created the task", async () => {
    await expect(
      ctx.useCase.execute({ actor: OTHER_COORDINATOR, taskId: "task-1", newOwnerId: "stu-2" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies reassigning to the Secretary", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", newOwnerId: "sec-1" }),
    ).rejects.toBeInstanceOf(CannotAssignTaskToRoleError);
  });

  it("throws TaskNotFoundError for an unknown task", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, taskId: "unknown", newOwnerId: "stu-2" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("notifies the new owner", async () => {
    await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", newOwnerId: "stu-2" });
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-2", template: "TASK_REASSIGNED" }),
    );
  });

  it("records a TASK_REASSIGNED audit entry", async () => {
    await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1", newOwnerId: "stu-2" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "TASK_REASSIGNED", metadata: { previousOwnerId: "stu-1", newOwnerId: "stu-2" } }),
    );
  });
});
