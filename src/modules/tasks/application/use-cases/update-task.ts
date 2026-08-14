import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { JobDispatcher } from "@/modules/jobs";
import type { TaskPriority, TaskRecord } from "../../domain/entities";
import { TASK_OVERDUE_CHECK_JOB_TYPE, TASK_REMINDER_CHECK_JOB_TYPE } from "../../domain/entities";
import { canManageTask } from "../../domain/permissions";
import { TaskNotFoundError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";

export interface UpdateTaskInput {
  actor: AuthenticatedActor;
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  deadline?: Date | null;
  reminderAt?: Date | null;
}

export interface UpdateTaskUseCaseDeps {
  taskRepository: TaskRepository;
  jobDispatcher: JobDispatcher;
  auditRecorder: AuditRecorder;
}

/**
 * If `deadline`/`reminderAt` changes, a fresh one-shot check job is
 * scheduled for the new time — the previous job (if any) is left in place
 * rather than cancelled; its handler re-reads the task's current
 * deadline/reminderAt at fire time and no-ops when it no longer matches
 * (see domain/entities.ts's job-type doc comment).
 */
export class UpdateTaskUseCase {
  constructor(private readonly deps: UpdateTaskUseCaseDeps) {}

  async execute(input: UpdateTaskInput): Promise<TaskRecord> {
    const existing = await this.deps.taskRepository.findById(input.taskId);
    if (!existing) throw new TaskNotFoundError();
    if (!canManageTask(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this task");
    }

    const updated = await this.deps.taskRepository.update(input.taskId, {
      title: input.title?.trim(),
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      priority: input.priority,
      deadline: input.deadline,
      reminderAt: input.reminderAt,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_UPDATED,
      targetEntityType: "Task",
      targetEntityId: updated.id,
    });

    const now = new Date();
    const reminderChanged = input.reminderAt !== undefined && input.reminderAt?.getTime() !== existing.reminderAt?.getTime();
    const deadlineChanged = input.deadline !== undefined && input.deadline?.getTime() !== existing.deadline?.getTime();

    if (reminderChanged && updated.reminderAt && updated.reminderAt.getTime() > now.getTime()) {
      await this.deps.jobDispatcher.dispatch(TASK_REMINDER_CHECK_JOB_TYPE, { taskId: updated.id }, { runAt: updated.reminderAt });
    }
    if (deadlineChanged && updated.deadline && updated.deadline.getTime() > now.getTime()) {
      await this.deps.jobDispatcher.dispatch(TASK_OVERDUE_CHECK_JOB_TYPE, { taskId: updated.id }, { runAt: updated.deadline });
    }

    return updated;
  }
}
