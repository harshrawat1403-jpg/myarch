import { describe, expect, it, vi } from "vitest";
import { TaskReminderJobHandler } from "../../../src/modules/tasks/infrastructure/task-reminder-job-handler";
import { TaskOverdueCheckJobHandler } from "../../../src/modules/tasks/infrastructure/task-overdue-job-handler";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TaskRecord } from "../../../src/modules/tasks";

function record(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date();
  return {
    id: "task-1",
    title: "Task",
    description: null,
    status: "IN_PROGRESS",
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

describe("TaskReminderJobHandler", () => {
  it("sends a reminder when the task is still active and reminderAt has passed", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ reminderAt: new Date(Date.now() - 1000) }));
    const notificationService = new FakeNotificationService();
    const handler = new TaskReminderJobHandler({ taskRepository, notificationService });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "TASK_DEADLINE_APPROACHING" }),
    );
  });

  it("no-ops for a completed task (self-correcting against a stale fire)", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ status: "DONE", reminderAt: new Date(Date.now() - 1000) }));
    const notificationService = new FakeNotificationService();
    const handler = new TaskReminderJobHandler({ taskRepository, notificationService });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toHaveLength(0);
  });

  it("no-ops when reminderAt has since moved to the future (a fresh job was scheduled for it)", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ reminderAt: new Date(Date.now() + 60_000) }));
    const notificationService = new FakeNotificationService();
    const handler = new TaskReminderJobHandler({ taskRepository, notificationService });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toHaveLength(0);
  });

  it("no-ops for a task that no longer exists", async () => {
    const taskRepository = new InMemoryTaskRepository();
    const notificationService = new FakeNotificationService();
    const handler = new TaskReminderJobHandler({ taskRepository, notificationService });

    await handler.handle({ taskId: "ghost" });

    expect(notificationService.sent).toHaveLength(0);
  });
});

describe("TaskOverdueCheckJobHandler — the reusable escalation engine", () => {
  it("notifies the owner, auto-escalates, and notifies every active Secretary once the deadline has passed", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ deadline: new Date(Date.now() - 1000) }));
    const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1", "sec-2"]) };
    const notificationService = new FakeNotificationService();
    const auditRecorder = new FakeAuditRecorder();
    const handler = new TaskOverdueCheckJobHandler({ taskRepository, secretaryRecipientLookup, notificationService, auditRecorder });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "TASK_OVERDUE" }),
    );
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-1", template: "TASK_ESCALATED" }),
    );
    expect(notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-2", template: "TASK_ESCALATED" }),
    );

    const updated = await taskRepository.findById("task-1");
    expect(updated?.escalatedAt).not.toBeNull();
    expect(updated?.escalatedToId).toBe("sec-1");

    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "TASK_ESCALATED", metadata: { auto: true, reason: "overdue" } }),
    );
  });

  it("no-ops for a completed task", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ status: "DONE", deadline: new Date(Date.now() - 1000) }));
    const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1"]) };
    const notificationService = new FakeNotificationService();
    const auditRecorder = new FakeAuditRecorder();
    const handler = new TaskOverdueCheckJobHandler({ taskRepository, secretaryRecipientLookup, notificationService, auditRecorder });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toHaveLength(0);
  });

  it("no-ops when the deadline has since moved to the future", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ deadline: new Date(Date.now() + 60_000) }));
    const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1"]) };
    const notificationService = new FakeNotificationService();
    const auditRecorder = new FakeAuditRecorder();
    const handler = new TaskOverdueCheckJobHandler({ taskRepository, secretaryRecipientLookup, notificationService, auditRecorder });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toHaveLength(0);
  });

  it("skips a task that has already been escalated (best-effort idempotency)", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ deadline: new Date(Date.now() - 1000), escalatedAt: new Date() }));
    const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1"]) };
    const notificationService = new FakeNotificationService();
    const auditRecorder = new FakeAuditRecorder();
    const handler = new TaskOverdueCheckJobHandler({ taskRepository, secretaryRecipientLookup, notificationService, auditRecorder });

    await handler.handle({ taskId: "task-1" });

    expect(notificationService.sent).toHaveLength(0);
  });
});
