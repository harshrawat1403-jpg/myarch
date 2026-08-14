import crypto from "node:crypto";
import type {
  PaginatedResult,
  PaginationInput,
  RequestDecision,
  RequestFilters,
  RequestRecord,
  RequestSort,
  RequestStatus,
} from "../../../src/modules/requests";
import type {
  CreateRequestData,
  RequestRepository,
  UpdateRequestData,
} from "../../../src/modules/requests/application/ports/request-repository";

export class InMemoryRequestRepository implements RequestRepository {
  private readonly byId = new Map<string, RequestRecord>();

  seed(record: RequestRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateRequestData): Promise<RequestRecord> {
    const now = new Date();
    const record: RequestRecord = {
      id: crypto.randomUUID(),
      type: data.type,
      description: data.description,
      priority: data.priority ?? "MEDIUM",
      status: "SUBMITTED",
      requesterId: data.requesterId,
      ownerId: null,
      deadline: null,
      taskId: null,
      decision: null,
      decisionReason: null,
      decidedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<RequestRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private mustGet(id: string): RequestRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No request with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateRequestData): Promise<RequestRecord> {
    const existing = this.mustGet(id);
    const updated: RequestRecord = {
      ...existing,
      priority: data.priority ?? existing.priority,
      deadline: data.deadline !== undefined ? data.deadline : existing.deadline,
      description: data.description ?? existing.description,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async startReview(id: string): Promise<RequestRecord> {
    const existing = this.mustGet(id);
    const updated: RequestRecord = { ...existing, status: "REVIEW" };
    this.byId.set(id, updated);
    return updated;
  }

  async decide(id: string, decision: RequestDecision, decisionReason: string | null): Promise<RequestRecord> {
    const existing = this.mustGet(id);
    const updated: RequestRecord = {
      ...existing,
      decision,
      decisionReason,
      decidedAt: new Date(),
      status: decision === "REJECTED" ? "CLOSED" : existing.status,
    };
    this.byId.set(id, updated);
    return updated;
  }

  async assign(id: string, ownerId: string, taskId: string, deadline: Date | null): Promise<RequestRecord> {
    const existing = this.mustGet(id);
    const updated: RequestRecord = { ...existing, status: "ASSIGNED", ownerId, taskId, deadline };
    this.byId.set(id, updated);
    return updated;
  }

  async reassign(id: string, ownerId: string): Promise<RequestRecord> {
    const existing = this.mustGet(id);
    const updated: RequestRecord = { ...existing, ownerId };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: RequestStatus): Promise<RequestRecord> {
    const existing = this.mustGet(id);
    const updated: RequestRecord = { ...existing, status };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: RequestFilters, sort: RequestSort, pagination: PaginationInput): Promise<PaginatedResult<RequestRecord>> {
    const now = new Date();
    const OPEN: RequestStatus[] = ["SUBMITTED", "REVIEW", "ASSIGNED", "IN_PROGRESS"];
    let items = [...this.byId.values()].filter((request) => {
      if (filters.status && request.status !== filters.status) return false;
      if (filters.type && request.type !== filters.type) return false;
      if (filters.priority && request.priority !== filters.priority) return false;
      if (filters.requesterId && request.requesterId !== filters.requesterId) return false;
      if (filters.ownerId && request.ownerId !== filters.ownerId) return false;
      if (filters.search && !request.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.overdueOnly) {
        if (!request.deadline || request.deadline.getTime() >= now.getTime()) return false;
        if (!OPEN.includes(request.status)) return false;
      }
      return true;
    });

    const priorityRank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
    items = items.sort((a, b) => {
      let cmp = 0;
      if (sort.field === "priority") cmp = (priorityRank[a.priority] ?? 0) - (priorityRank[b.priority] ?? 0);
      else if (sort.field === "deadline") cmp = (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity);
      else cmp = a[sort.field].getTime() - b[sort.field].getTime();
      return sort.direction === "asc" ? cmp : -cmp;
    });

    const total = items.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const page = items.slice(start, start + pagination.pageSize);
    return { items: page, total, page: pagination.page, pageSize: pagination.pageSize };
  }
}
