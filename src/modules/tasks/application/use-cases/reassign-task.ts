import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { TaskRecord } from "../../domain/entities";
import { canAssignTaskTo, canManageTask } from "../../domain/permissions";
import { CannotAssignTaskToRoleError, TaskNotFoundError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";
import type { UserRoleLookup } from "../ports/user-role-lookup";

export interface ReassignTaskInput {
  actor: AuthenticatedActor;
  taskId: string;
  newOwnerId: string;
}

export interface ReassignTaskUseCaseDeps {
  taskRepository: TaskRepository;
  userRoleLookup: UserRoleLookup;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
}

export class ReassignTaskUseCase {
  constructor(private readonly deps: ReassignTaskUseCaseDeps) {}

  async execute(input: ReassignTaskInput): Promise<TaskRecord> {
    const existing = await this.deps.taskRepository.findById(input.taskId);
    if (!existing) throw new TaskNotFoundError();
    if (!canManageTask(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to reassign this task");
    }

    const newOwnerRole = await this.deps.userRoleLookup.findRoleByUserId(input.newOwnerId);
    if (!newOwnerRole || !canAssignTaskTo(input.actor, input.newOwnerId, newOwnerRole)) {
      throw new CannotAssignTaskToRoleError();
    }

    const updated = await this.deps.taskRepository.reassign(input.taskId, input.newOwnerId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_REASSIGNED,
      targetEntityType: "Task",
      targetEntityId: updated.id,
      metadata: { previousOwnerId: existing.ownerId, newOwnerId: updated.ownerId },
    });

    await this.deps.notificationService.notify({
      recipientUserId: updated.ownerId,
      template: "TASK_REASSIGNED",
      context: { taskId: updated.id, title: updated.title },
    });

    return updated;
  }
}
