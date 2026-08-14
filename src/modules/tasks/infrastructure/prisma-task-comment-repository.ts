import type { PrismaClient } from "@prisma/client";
import type { TaskCommentRecord } from "../domain/entities";
import type { TaskCommentRepository } from "../application/ports/task-comment-repository";

export class PrismaTaskCommentRepository implements TaskCommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(taskId: string, authorId: string, body: string): Promise<TaskCommentRecord> {
    const row = await this.prisma.taskComment.create({ data: { taskId, authorId, body } });
    return { id: row.id, taskId: row.taskId, authorId: row.authorId, body: row.body, createdAt: row.createdAt };
  }

  async listForTask(taskId: string): Promise<TaskCommentRecord[]> {
    const rows = await this.prisma.taskComment.findMany({ where: { taskId }, orderBy: { createdAt: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt,
    }));
  }
}
