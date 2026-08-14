import type { TaskCommentRecord } from "../../domain/entities";

export interface TaskCommentRepository {
  add(taskId: string, authorId: string, body: string): Promise<TaskCommentRecord>;
  listForTask(taskId: string): Promise<TaskCommentRecord[]>;
}
