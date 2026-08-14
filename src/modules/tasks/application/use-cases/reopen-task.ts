import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { TaskRecord } from "../../domain/entities";
import { isTerminalTaskStatus } from "../../domain/entities";
import { canManageTask } from "../../domain/permissions";
import { TaskNotFoundError, TaskNotReopenableError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";

export interface ReopenTaskInput {
  actor: AuthenticatedActor;
  taskId: string;
}

export interface ReopenTaskUseCaseDeps {
  taskRepository: TaskRepository;
  auditRecorder: AuditRecorder;
}

export class ReopenTaskUseCase {
  constructor(private readonly deps: ReopenTaskUseCaseDeps) {}

  async execute(input: ReopenTaskInput): Promise<TaskRecord> {
    const existing = await this.deps.taskRepository.findById(input.taskId);
    if (!existing) throw new TaskNotFoundError();
    if (!canManageTask(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to reopen this task");
    }
    if (!isTerminalTaskStatus(existing.status)) {
      throw new TaskNotReopenableError();
    }

    const updated = await this.deps.taskRepository.reopen(input.taskId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_REOPENED,
      targetEntityType: "Task",
      targetEntityId: updated.id,
      metadata: { previousStatus: existing.status },
    });

    return updated;
  }
}
