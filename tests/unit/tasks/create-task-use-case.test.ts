import { beforeEach, describe, expect, it } from "vitest";
import { CreateTaskUseCase } from "../../../src/modules/tasks/application/use-cases/create-task";
import { CannotAssignTaskToRoleError } from "../../../src/modules/tasks";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import { FakeUserRoleLookup } from "../../support/fakes/fake-user-role-lookup";
import { FakeJobDispatcher } from "../../support/fakes/fake-job-dispatcher";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

function buildContext() {
  const taskRepository = new InMemoryTaskRepository();
  const userRoleLookup = new FakeUserRoleLookup();
  userRoleLookup.seed("stu-1", "STUDENT");
  userRoleLookup.seed("sec-1", "SECRETARY");
  userRoleLookup.seed("coord-1", "COORDINATOR");
  userRoleLookup.seed("coord-2", "COORDINATOR");
  const jobDispatcher = new FakeJobDispatcher();
  const notificationService = new FakeNotificationService();
  const auditRecorder = new FakeAuditRecorder();

  const useCase = new CreateTaskUseCase({ taskRepository, userRoleLookup, jobDispatcher, notificationService, auditRecorder });
  return { useCase, taskRepository, userRoleLookup, jobDispatcher, notificationService, auditRecorder };
}

describe("CreateTaskUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a TODO task with the given owner", async () => {
    const task = await ctx.useCase.execute({ actor: SECRETARY, title: "Fix the projector", ownerId: "stu-1" });
    expect(task.status).toBe("TODO");
    expect(task.ownerId).toBe("stu-1");
    expect(task.creatorId).toBe("sec-1");
  });

  it("denies a Student from creating tasks", async () => {
    await expect(ctx.useCase.execute({ actor: STUDENT, title: "x", ownerId: "stu-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Coordinator assigning a task to the Secretary (privilege-escalation guard)", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, title: "x", ownerId: "sec-1" }),
    ).rejects.toBeInstanceOf(CannotAssignTaskToRoleError);
  });

  it("denies a Coordinator assigning a task to another Coordinator", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, title: "x", ownerId: "coord-2" }),
    ).rejects.toBeInstanceOf(CannotAssignTaskToRoleError);
  });

  it("allows a Coordinator to assign a task to a Student or to themselves", async () => {
    await expect(ctx.useCase.execute({ actor: COORDINATOR, title: "x", ownerId: "stu-1" })).resolves.toBeDefined();
    await expect(ctx.useCase.execute({ actor: COORDINATOR, title: "x", ownerId: "coord-1" })).resolves.toBeDefined();
  });

  it("rejects an unknown owner", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, title: "x", ownerId: "ghost-user" }),
    ).rejects.toBeInstanceOf(CannotAssignTaskToRoleError);
  });

  it("schedules a reminder job when reminderAt is set in the future", async () => {
    const reminderAt = new Date(Date.now() + 60_000);
    await ctx.useCase.execute({ actor: SECRETARY, title: "x", ownerId: "stu-1", reminderAt });
    expect(ctx.jobDispatcher.dispatched).toContainEqual(
      expect.objectContaining({ type: "TASK_REMINDER_CHECK", options: { runAt: reminderAt } }),
    );
  });

  it("schedules an overdue-check job when deadline is set in the future", async () => {
    const deadline = new Date(Date.now() + 120_000);
    await ctx.useCase.execute({ actor: SECRETARY, title: "x", ownerId: "stu-1", deadline });
    expect(ctx.jobDispatcher.dispatched).toContainEqual(
      expect.objectContaining({ type: "TASK_OVERDUE_CHECK", options: { runAt: deadline } }),
    );
  });

  it("does not schedule a job for a deadline/reminder already in the past", async () => {
    const past = new Date(Date.now() - 60_000);
    await ctx.useCase.execute({ actor: SECRETARY, title: "x", ownerId: "stu-1", deadline: past, reminderAt: past });
    expect(ctx.jobDispatcher.dispatched).toHaveLength(0);
  });

  it("notifies the owner when assigned to someone other than the creator", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, title: "x", ownerId: "stu-1" });
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "TASK_ASSIGNED" }),
    );
  });

  it("does not notify when the creator assigns the task to themselves", async () => {
    await ctx.useCase.execute({ actor: COORDINATOR, title: "x", ownerId: "coord-1" });
    expect(ctx.notificationService.sent).toHaveLength(0);
  });

  it("records a TASK_CREATED audit entry", async () => {
    const task = await ctx.useCase.execute({ actor: SECRETARY, title: "x", ownerId: "stu-1" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "TASK_CREATED", targetEntityId: task.id }),
    );
  });
});
