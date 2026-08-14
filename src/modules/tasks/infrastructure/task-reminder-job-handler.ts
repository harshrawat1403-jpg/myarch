import type { JobHandler } from "@/modules/jobs";
import type { NotificationService } from "@/modules/notifications";
import { TASK_REMINDER_CHECK_JOB_TYPE, type TaskReminderCheckJobPayload } from "../domain/entities";
import { isTerminalTaskStatus } from "../domain/entities";
import type { TaskRepository } from "../application/ports/task-repository";

/**
 * Registered against TASK_REMINDER_CHECK in the shared JobRegistry (see
 * infrastructure/container.ts's registerJobHandlers()). One-shot, scheduled
 * at Task.reminderAt by CreateTaskUseCase/UpdateTaskUseCase. Re-reads the
 * task's CURRENT state at fire time rather than trusting the payload — if
 * the task has since been completed/cancelled, or reminderAt has since
 * moved to a later time (a fresh job was scheduled for that time), this
 * no-ops instead of sending a stale/duplicate reminder.
 */
export class TaskReminderJobHandler implements JobHandler {
  readonly type = TASK_REMINDER_CHECK_JOB_TYPE;

  constructor(private readonly deps: { taskRepository: TaskRepository; notificationService: NotificationService }) {}

  async handle(rawPayload: Record<string, unknown>): Promise<void> {
    const { taskId } = rawPayload as unknown as TaskReminderCheckJobPayload;
    const task = await this.deps.taskRepository.findById(taskId);
    if (!task || isTerminalTaskStatus(task.status)) return;
    if (!task.reminderAt || task.reminderAt.getTime() > Date.now()) return;

    await this.deps.notificationService.notify({
      recipientUserId: task.ownerId,
      template: "TASK_DEADLINE_APPROACHING",
      context: { taskId: task.id, title: task.title },
    });
  }
}
