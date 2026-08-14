import { Prisma, type PrismaClient, type Task as PrismaTask } from "@prisma/client";
import type {
  PaginatedResult,
  PaginationInput,
  TaskFilters,
  TaskRecord,
  TaskSort,
  TaskStatus,
} from "../domain/entities";
import type { CreateTaskData, TaskRepository, UpdateTaskData } from "../application/ports/task-repository";

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTaskData): Promise<TaskRecord> {
    const row = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? "MEDIUM",
        ownerId: data.ownerId,
        creatorId: data.creatorId,
        deadline: data.deadline ?? null,
        reminderAt: data.reminderAt ?? null,
        relatedEntityType: data.relatedEntityType ?? null,
        relatedEntityId: data.relatedEntityId ?? null,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<TaskRecord | null> {
    const row = await this.prisma.task.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateTaskData): Promise<TaskRecord> {
    const row = await this.prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        deadline: data.deadline,
        reminderAt: data.reminderAt,
      },
    });
    return toDomain(row);
  }

  async setStatus(id: string, status: TaskStatus): Promise<TaskRecord> {
    const row = await this.prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
      },
    });
    return toDomain(row);
  }

  async reopen(id: string): Promise<TaskRecord> {
    const row = await this.prisma.task.update({
      where: { id },
      data: { status: "TODO", completedAt: null, cancelledAt: null },
    });
    return toDomain(row);
  }

  async reassign(id: string, newOwnerId: string): Promise<TaskRecord> {
    const row = await this.prisma.task.update({ where: { id }, data: { ownerId: newOwnerId } });
    return toDomain(row);
  }

  async escalate(id: string, escalatedToId: string | null): Promise<TaskRecord> {
    const row = await this.prisma.task.update({
      where: { id },
      data: { escalatedAt: new Date(), escalatedToId },
    });
    return toDomain(row);
  }

  async search(filters: TaskFilters, sort: TaskSort, pagination: PaginationInput): Promise<PaginatedResult<TaskRecord>> {
    const now = new Date();
    const where: Prisma.TaskWhereInput = {
      status: filters.status,
      priority: filters.priority,
      ownerId: filters.ownerId,
      creatorId: filters.creatorId,
      relatedEntityType: filters.relatedEntityType,
      relatedEntityId: filters.relatedEntityId,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      ...(filters.involvingUserId
        ? { OR: [{ ownerId: filters.involvingUserId }, { creatorId: filters.involvingUserId }] }
        : {}),
      ...(filters.overdueOnly
        ? { deadline: { lt: now }, status: { notIn: ["DONE", "CANCELLED"] } }
        : {}),
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput =
      sort.field === "priority" ? { priority: sort.direction } : { [sort.field]: sort.direction };

    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

function toDomain(row: PrismaTask): TaskRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ownerId: row.ownerId,
    creatorId: row.creatorId,
    deadline: row.deadline,
    reminderAt: row.reminderAt,
    escalatedAt: row.escalatedAt,
    escalatedToId: row.escalatedToId,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
