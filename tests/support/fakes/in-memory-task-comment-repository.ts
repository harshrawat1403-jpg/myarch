import crypto from "node:crypto";
import type { TaskCommentRecord } from "../../../src/modules/tasks";
import type { TaskCommentRepository } from "../../../src/modules/tasks/application/ports/task-comment-repository";

export class InMemoryTaskCommentRepository implements TaskCommentRepository {
  private readonly comments: TaskCommentRecord[] = [];

  async add(taskId: string, authorId: string, body: string): Promise<TaskCommentRecord> {
    const comment: TaskCommentRecord = { id: crypto.randomUUID(), taskId, authorId, body, createdAt: new Date() };
    this.comments.push(comment);
    return comment;
  }

  async listForTask(taskId: string): Promise<TaskCommentRecord[]> {
    return this.comments.filter((c) => c.taskId === taskId);
  }
}
