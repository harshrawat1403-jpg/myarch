import type { JobHandler } from "@/modules/jobs";
import type { NotificationService } from "@/modules/notifications";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { TASK_OVERDUE_CHECK_JOB_TYPE, type TaskOverdueCheckJobPayload } from "../domain/entities";
import { isTerminalTaskStatus } from "../domain/entities";
import type { TaskRepository } from "../application/ports/task-repository";
import type { SecretaryRecipientLookup } from "../application/ports/secretary-recipient-lookup";

/**
 * Registered against TASK_OVERDUE_CHECK in the shared JobRegistry. One-shot,
 * scheduled at Task.deadline. This IS the "reusable escalation engine"
 * roadmap §3.6 asks for: any task, from any future domain
 * (maintenance/requests/events/...), automatically gets a deadline-driven
 * escalation to the Technical Secretary for free once it goes through
 * CreateTaskUseCase — no per-domain SLA logic needed.
 *
 * Re-reads current state at fire time (see TaskReminderJobHandler's own
 * doc comment for why) and skips a task that's already escalated — a
 * best-effort idempotency guard, not a hard lock; two overlapping fires are
 * a low-probability, low-consequence edge case (an extra notification) this
 * phase does not build dedicated infrastructure to fully rule out.
 */
export class TaskOverdueCheckJobHandler implements JobHandler {
  readonly type = TASK_OVERDUE_CHECK_JOB_TYPE;

  constructor(
    private readonly deps: {
      taskRepository: TaskRepository;
      secretaryRecipientLookup: SecretaryRecipientLookup;
      notificationService: NotificationService;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async handle(rawPayload: Record<string, unknown>): Promise<void> {
    const { taskId } = rawPayload as unknown as TaskOverdueCheckJobPayload;
    const task = await this.deps.taskRepository.findById(taskId);
    if (!task || isTerminalTaskStatus(task.status) || task.escalatedAt) return;
    if (!task.deadline || task.deadline.getTime() > Date.now()) return;

    await this.deps.notificationService.notify({
      recipientUserId: task.ownerId,
      template: "TASK_OVERDUE",
      context: { taskId: task.id, title: task.title },
    });

    const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    await this.deps.taskRepository.escalate(task.id, secretaryUserIds[0] ?? null);

    await this.deps.auditRecorder.record({
      // No human actor triggers an automated overdue escalation — attributed
      // to the task's creator (the accountable party for its follow-through),
      // mirroring AcademicYearTransitionJobHandler's own precedent of
      // attributing an automated completion to the run's original initiating
      // actor rather than inventing a synthetic "system" user.
      actorUserId: task.creatorId,
      action: AUDIT_ACTIONS.TASK_ESCALATED,
      targetEntityType: "Task",
      targetEntityId: task.id,
      metadata: { auto: true, reason: "overdue" },
    });

    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "TASK_ESCALATED",
          context: { taskId: task.id, title: task.title },
        }),
      ),
    );
  }
}
