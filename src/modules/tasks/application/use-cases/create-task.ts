import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { JobDispatcher } from "@/modules/jobs";
import type { TaskPriority, TaskRecord } from "../../domain/entities";
import { TASK_OVERDUE_CHECK_JOB_TYPE, TASK_REMINDER_CHECK_JOB_TYPE } from "../../domain/entities";
import { canAssignTaskTo, canCreateTask } from "../../domain/permissions";
import { CannotAssignTaskToRoleError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";
import type { UserRoleLookup } from "../ports/user-role-lookup";

export interface CreateTaskInput {
  actor: AuthenticatedActor;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  ownerId: string;
  deadline?: Date | null;
  reminderAt?: Date | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface CreateTaskUseCaseDeps {
  taskRepository: TaskRepository;
  userRoleLookup: UserRoleLookup;
  jobDispatcher: JobDispatcher;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
}

/**
 * MYARCH Phase 2 (§3.8). Every task has an owner from the moment of
 * creation (no "unassigned" state — see domain/entities.ts's status list,
 * which has no such status) — "assign" is simply supplying `ownerId` here;
 * "reassign" (ReassignTaskUseCase) is the only later change of owner.
 */
export class CreateTaskUseCase {
  constructor(private readonly deps: CreateTaskUseCaseDeps) {}

  async execute(input: CreateTaskInput): Promise<TaskRecord> {
    if (!canCreateTask(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create tasks");
    }

    const ownerRole = await this.deps.userRoleLookup.findRoleByUserId(input.ownerId);
    if (!ownerRole || !canAssignTaskTo(input.actor, input.ownerId, ownerRole)) {
      throw new CannotAssignTaskToRoleError();
    }

    const task = await this.deps.taskRepository.create({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority,
      ownerId: input.ownerId,
      creatorId: input.actor.userId,
      deadline: input.deadline ?? null,
      reminderAt: input.reminderAt ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_CREATED,
      targetEntityType: "Task",
      targetEntityId: task.id,
      metadata: { title: task.title, ownerId: task.ownerId },
    });

    const now = new Date();
    if (task.reminderAt && task.reminderAt.getTime() > now.getTime()) {
      await this.deps.jobDispatcher.dispatch(TASK_REMINDER_CHECK_JOB_TYPE, { taskId: task.id }, { runAt: task.reminderAt });
    }
    if (task.deadline && task.deadline.getTime() > now.getTime()) {
      await this.deps.jobDispatcher.dispatch(TASK_OVERDUE_CHECK_JOB_TYPE, { taskId: task.id }, { runAt: task.deadline });
    }

    if (task.ownerId !== task.creatorId) {
      await this.deps.notificationService.notify({
        recipientUserId: task.ownerId,
        template: "TASK_ASSIGNED",
        context: { taskId: task.id, title: task.title },
      });
    }

    return task;
  }
}
