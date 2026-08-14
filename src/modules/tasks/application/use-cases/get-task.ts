import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { TaskCommentRecord, TaskRecord } from "../../domain/entities";
import { canViewTask } from "../../domain/permissions";
import { TaskNotFoundError } from "../../domain/errors";
import type { TaskRepository } from "../ports/task-repository";
import type { TaskCommentRepository } from "../ports/task-comment-repository";

export interface GetTaskInput {
  actor: AuthenticatedActor;
  taskId: string;
}

export interface GetTaskResult {
  task: TaskRecord;
  comments: readonly TaskCommentRecord[];
}

export class GetTaskUseCase {
  constructor(
    private readonly deps: { taskRepository: TaskRepository; taskCommentRepository: TaskCommentRepository },
  ) {}

  async execute(input: GetTaskInput): Promise<GetTaskResult> {
    const task = await this.deps.taskRepository.findById(input.taskId);
    if (!task) throw new TaskNotFoundError();
    if (!canViewTask(input.actor, task)) {
      throw new NotAuthorizedError("Not authorized to view this task");
    }

    const comments = await this.deps.taskCommentRepository.listForTask(input.taskId);
    return { task, comments };
  }
}
