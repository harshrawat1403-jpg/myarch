import crypto from "node:crypto";
import type {
  MaintenanceIssueFilters,
  MaintenanceIssueRecord,
  MaintenanceIssueSort,
  MaintenanceIssueStatus,
  PaginatedResult,
  PaginationInput,
} from "../../../src/modules/maintenance";
import type {
  CreateMaintenanceIssueData,
  DashboardStats,
  MaintenanceIssueRepository,
  UpdateMaintenanceIssueData,
} from "../../../src/modules/maintenance/application/ports/maintenance-issue-repository";

const RESOLVED_LIKE: MaintenanceIssueStatus[] = ["RESOLVED", "VERIFIED", "CLOSED"];

export class InMemoryMaintenanceIssueRepository implements MaintenanceIssueRepository {
  private readonly byId = new Map<string, MaintenanceIssueRecord>();

  seed(record: MaintenanceIssueRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateMaintenanceIssueData): Promise<MaintenanceIssueRecord> {
    const now = new Date();
    const record: MaintenanceIssueRecord = {
      id: crypto.randomUUID(),
      category: data.category,
      location: data.location,
      description: data.description,
      priority: data.priority ?? "MEDIUM",
      status: "SUBMITTED",
      requesterId: data.requesterId,
      assigneeId: null,
      deadline: null,
      taskId: null,
      resolutionDetails: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<MaintenanceIssueRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private mustGet(id: string): MaintenanceIssueRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No maintenance issue with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateMaintenanceIssueData): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = {
      ...existing,
      priority: data.priority ?? existing.priority,
      deadline: data.deadline !== undefined ? data.deadline : existing.deadline,
      description: data.description ?? existing.description,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async acknowledge(id: string): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = { ...existing, status: "ACKNOWLEDGED", acknowledgedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async assign(id: string, assigneeId: string, taskId: string, deadline: Date | null): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = { ...existing, status: "ASSIGNED", assigneeId, taskId, deadline };
    this.byId.set(id, updated);
    return updated;
  }

  async reassign(id: string, assigneeId: string): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = { ...existing, assigneeId };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: MaintenanceIssueStatus): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = { ...existing, status };
    this.byId.set(id, updated);
    return updated;
  }

  async resolve(id: string, resolutionDetails: string): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = { ...existing, status: "RESOLVED", resolutionDetails, resolvedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async reopen(id: string): Promise<MaintenanceIssueRecord> {
    const existing = this.mustGet(id);
    const updated: MaintenanceIssueRecord = { ...existing, status: "REOPENED" };
    this.byId.set(id, updated);
    return updated;
  }

  async search(
    filters: MaintenanceIssueFilters,
    sort: MaintenanceIssueSort,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<MaintenanceIssueRecord>> {
    const now = new Date();
    let items = [...this.byId.values()].filter((issue) => {
      if (filters.status && issue.status !== filters.status) return false;
      if (filters.category && issue.category !== filters.category) return false;
      if (filters.priority && issue.priority !== filters.priority) return false;
      if (filters.requesterId && issue.requesterId !== filters.requesterId) return false;
      if (filters.assigneeId && issue.assigneeId !== filters.assigneeId) return false;
      if (filters.search && !issue.location.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.overdueOnly) {
        if (!issue.deadline || issue.deadline.getTime() >= now.getTime()) return false;
        if (RESOLVED_LIKE.includes(issue.status)) return false;
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

  async getDashboardStats(): Promise<DashboardStats> {
    const rows = [...this.byId.values()];
    const now = Date.now();
    const open = rows.filter((r) => !RESOLVED_LIKE.includes(r.status));
    return {
      open: open.length,
      critical: open.filter((r) => r.priority === "URGENT").length,
      overdue: open.filter((r) => r.deadline && r.deadline.getTime() < now).length,
      assigned: rows.filter((r) => r.status === "ASSIGNED").length,
      inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
      resolved: rows.filter((r) => RESOLVED_LIKE.includes(r.status)).length,
      averageResponseTimeMs: null,
      averageResolutionTimeMs: null,
      byCategory: {},
      byLocation: {},
      recurringLocations: [],
      escalatedCount: 0,
      coordinatorWorkload: {},
    };
  }
}
