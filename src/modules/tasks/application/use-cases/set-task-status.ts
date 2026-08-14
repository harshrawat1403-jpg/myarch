import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { TaskRecord, TaskStatus } from "../../domain/entities";
import { canManageTask, canUpdateOwnTaskStatus } from "../../domain/permissions";
import { isValidTaskStatusTransition } from "../../domain/task-status";
import { InvalidTaskStatusTransitionError, TaskNotFoundError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";

export interface SetTaskStatusInput {
  actor: AuthenticatedActor;
  taskId: string;
  status: TaskStatus;
}

export interface SetTaskStatusUseCaseDeps {
  taskRepository: TaskRepository;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
}

/**
 * Handles every forward transition in the state machine (TODO/IN_PROGRESS/
 * BLOCKED/DONE/CANCELLED) — "complete" is simply targeting DONE, "cancel" is
 * targeting CANCELLED. Reopening a terminal task is a distinct action
 * (ReopenTaskUseCase), not reachable through this use case (see
 * domain/task-status.ts).
 *
 * A Student may drive their own task through TODO → IN_PROGRESS → BLOCKED →
 * DONE (canUpdateOwnTaskStatus) but not CANCELLED — cancelling is a
 * management decision reserved for whoever owns the assignment relationship
 * (canManageTask: Secretary, or the Coordinator who owns/created it).
 */
export class SetTaskStatusUseCase {
  constructor(private readonly deps: SetTaskStatusUseCaseDeps) {}

  async execute(input: SetTaskStatusInput): Promise<TaskRecord> {
    const existing = await this.deps.taskRepository.findById(input.taskId);
    if (!existing) throw new TaskNotFoundError();

    const manages = canManageTask(input.actor, existing);
    const isOwnStudentTask = canUpdateOwnTaskStatus(input.actor, existing);
    if (!manages && !(isOwnStudentTask && input.status !== "CANCELLED")) {
      throw new NotAuthorizedError("Not authorized to change this task's status");
    }

    if (!isValidTaskStatusTransition(existing.status, input.status)) {
      throw new InvalidTaskStatusTransitionError(existing.status, input.status);
    }

    const updated = await this.deps.taskRepository.setStatus(input.taskId, input.status);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_STATUS_CHANGED,
      targetEntityType: "Task",
      targetEntityId: updated.id,
      metadata: { from: existing.status, to: updated.status },
    });

    if (updated.status === "DONE" && updated.creatorId !== input.actor.userId) {
      await this.deps.notificationService.notify({
        recipientUserId: updated.creatorId,
        template: "TASK_COMPLETED",
        context: { taskId: updated.id, title: updated.title },
      });
    }

    return updated;
  }
}
