import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { TaskCommentRecord } from "../../domain/entities";
import { canViewTask } from "../../domain/permissions";
import { TaskCommentBodyRequiredError, TaskNotFoundError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";
import type { TaskCommentRepository } from "../ports/task-comment-repository";

export interface AddTaskCommentInput {
  actor: AuthenticatedActor;
  taskId: string;
  body: string;
}

export interface AddTaskCommentUseCaseDeps {
  taskRepository: TaskRepository;
  taskCommentRepository: TaskCommentRepository;
  auditRecorder: AuditRecorder;
}

/** Anyone who can view a task may comment on it — including the owning Student, who has no full management rights but is expected to post updates. */
export class AddTaskCommentUseCase {
  constructor(private readonly deps: AddTaskCommentUseCaseDeps) {}

  async execute(input: AddTaskCommentInput): Promise<TaskCommentRecord> {
    const task = await this.deps.taskRepository.findById(input.taskId);
    if (!task) throw new TaskNotFoundError();
    if (!canViewTask(input.actor, task)) {
      throw new NotAuthorizedError("Not authorized to comment on this task");
    }

    const body = input.body.trim();
    if (!body) throw new TaskCommentBodyRequiredError();

    const comment = await this.deps.taskCommentRepository.add(input.taskId, input.actor.userId, body);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.TASK_COMMENT_ADDED,
      targetEntityType: "Task",
      targetEntityId: input.taskId,
    });

    return comment;
  }
}
