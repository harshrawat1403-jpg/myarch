import crypto from "node:crypto";
import type {
  CommitteeFilters,
  CommitteeRecord,
  CommitteeSort,
  CommitteeStatus,
  PaginatedResult,
  PaginationInput,
} from "../../../src/modules/committees";
import type {
  CommitteeRepository,
  CreateCommitteeData,
  UpdateCommitteeData,
} from "../../../src/modules/committees/application/ports/committee-repository";

export class InMemoryCommitteeRepository implements CommitteeRepository {
  private readonly byId = new Map<string, CommitteeRecord>();

  seed(record: CommitteeRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateCommitteeData): Promise<CommitteeRecord> {
    const now = new Date();
    const record: CommitteeRecord = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      status: "ACTIVE",
      academicYear: data.academicYear ?? null,
      responsibilities: data.responsibilities ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<CommitteeRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private mustGet(id: string): CommitteeRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No committee with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateCommitteeData): Promise<CommitteeRecord> {
    const existing = this.mustGet(id);
    const updated: CommitteeRecord = {
      ...existing,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.academicYear !== undefined ? { academicYear: data.academicYear } : {}),
      ...(data.responsibilities !== undefined ? { responsibilities: data.responsibilities } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: CommitteeStatus): Promise<CommitteeRecord> {
    const existing = this.mustGet(id);
    const updated: CommitteeRecord = { ...existing, status };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: CommitteeFilters, sort: CommitteeSort, pagination: PaginationInput): Promise<PaginatedResult<CommitteeRecord>> {
    let items = [...this.byId.values()].filter((committee) => {
      if (filters.type && committee.type !== filters.type) return false;
      if (filters.status && committee.status !== filters.status) return false;
      if (filters.academicYear && committee.academicYear !== filters.academicYear) return false;
      if (filters.search && !committee.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });

    items = items.sort((a, b) => {
      const cmp = String(a[sort.field]).localeCompare(String(b[sort.field]));
      return sort.direction === "asc" ? cmp : -cmp;
    });

    const total = items.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const page = items.slice(start, start + pagination.pageSize);
    return { items: page, total, page: pagination.page, pageSize: pagination.pageSize };
  }
}
