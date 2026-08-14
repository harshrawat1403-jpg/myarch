import crypto from "node:crypto";
import type {
  PaginatedResult,
  PaginationInput,
  TaskFilters,
  TaskRecord,
  TaskSort,
  TaskStatus,
} from "../../../src/modules/tasks";
import type {
  CreateTaskData,
  TaskRepository,
  UpdateTaskData,
} from "../../../src/modules/tasks/application/ports/task-repository";

export class InMemoryTaskRepository implements TaskRepository {
  private readonly byId = new Map<string, TaskRecord>();

  seed(record: TaskRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateTaskData): Promise<TaskRecord> {
    const now = new Date();
    const record: TaskRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description ?? null,
      status: "TODO",
      priority: data.priority ?? "MEDIUM",
      ownerId: data.ownerId,
      creatorId: data.creatorId,
      deadline: data.deadline ?? null,
      reminderAt: data.reminderAt ?? null,
      escalatedAt: null,
      escalatedToId: null,
      relatedEntityType: data.relatedEntityType ?? null,
      relatedEntityId: data.relatedEntityId ?? null,
      completedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<TaskRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async update(id: string, data: UpdateTaskData): Promise<TaskRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No task with id ${id}`);
    const updated: TaskRecord = {
      ...existing,
      title: data.title ?? existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      priority: data.priority ?? existing.priority,
      deadline: data.deadline !== undefined ? data.deadline : existing.deadline,
      reminderAt: data.reminderAt !== undefined ? data.reminderAt : existing.reminderAt,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: TaskStatus): Promise<TaskRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No task with id ${id}`);
    const updated: TaskRecord = {
      ...existing,
      status,
      completedAt: status === "DONE" ? new Date() : existing.completedAt,
      cancelledAt: status === "CANCELLED" ? new Date() : existing.cancelledAt,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async reopen(id: string): Promise<TaskRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No task with id ${id}`);
    const updated: TaskRecord = { ...existing, status: "TODO", completedAt: null, cancelledAt: null, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async reassign(id: string, newOwnerId: string): Promise<TaskRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No task with id ${id}`);
    const updated: TaskRecord = { ...existing, ownerId: newOwnerId, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async escalate(id: string, escalatedToId: string | null): Promise<TaskRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No task with id ${id}`);
    const updated: TaskRecord = { ...existing, escalatedAt: new Date(), escalatedToId, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: TaskFilters, sort: TaskSort, pagination: PaginationInput): Promise<PaginatedResult<TaskRecord>> {
    const now = new Date();
    let items = [...this.byId.values()].filter((task) => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.ownerId && task.ownerId !== filters.ownerId) return false;
      if (filters.creatorId && task.creatorId !== filters.creatorId) return false;
      if (filters.involvingUserId && task.ownerId !== filters.involvingUserId && task.creatorId !== filters.involvingUserId) {
        return false;
      }
      if (filters.relatedEntityType && task.relatedEntityType !== filters.relatedEntityType) return false;
      if (filters.relatedEntityId && task.relatedEntityId !== filters.relatedEntityId) return false;
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.overdueOnly) {
        if (!task.deadline || task.deadline.getTime() >= now.getTime()) return false;
        if (task.status === "DONE" || task.status === "CANCELLED") return false;
      }
      return true;
    });

    const priorityRank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
    items = items.sort((a, b) => {
      let cmp = 0;
      if (sort.field === "priority") {
        cmp = (priorityRank[a.priority] ?? 0) - (priorityRank[b.priority] ?? 0);
      } else if (sort.field === "deadline") {
        cmp = (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity);
      } else {
        cmp = a[sort.field].getTime() - b[sort.field].getTime();
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });

    const total = items.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const page = items.slice(start, start + pagination.pageSize);
    return { items: page, total, page: pagination.page, pageSize: pagination.pageSize };
  }
}
