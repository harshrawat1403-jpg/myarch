import { describe, expect, it, vi } from "vitest";
import { EscalateTaskUseCase } from "../../../src/modules/tasks/application/use-cases/escalate-task";
import { TaskNotFoundError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TaskRecord } from "../../../src/modules/tasks";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date();
  return {
    id: "task-1",
    title: "Some task",
    description: null,
    status: "IN_PROGRESS",
    priority: "HIGH",
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

function buildContext(secretaryIds: string[] = ["sec-1"]) {
  const taskRepository = new InMemoryTaskRepository();
  taskRepository.seed(record());
  const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(secretaryIds) };
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new EscalateTaskUseCase({ taskRepository, secretaryRecipientLookup, notificationService, auditRecorder });
  return { useCase, taskRepository, notificationService, auditRecorder };
}

describe("EscalateTaskUseCase", () => {
  it("stamps escalatedAt and escalatedToId to the resolved Secretary", async () => {
    const ctx = buildContext();
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1" });
    expect(updated.escalatedAt).not.toBeNull();
    expect(updated.escalatedToId).toBe("sec-1");
  });

  it("notifies every active Secretary", async () => {
    const ctx = buildContext(["sec-1", "sec-2"]);
    await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1" });
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-1", template: "TASK_ESCALATED" }),
    );
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-2", template: "TASK_ESCALATED" }),
    );
  });

  it("records escalatedToId as null when no active Secretary exists", async () => {
    const ctx = buildContext([]);
    const updated = await ctx.useCase.execute({ actor: COORDINATOR, taskId: "task-1" });
    expect(updated.escalatedToId).toBeNull();
    expect(updated.escalatedAt).not.toBeNull();
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
});
