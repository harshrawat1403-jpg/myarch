import crypto from "node:crypto";
import type { AnnouncementFilters, AnnouncementRecord, AnnouncementSort, PaginatedResult, PaginationInput } from "../../../src/modules/announcements";
import type {
  AnnouncementRepository,
  CreateAnnouncementData,
  UpdateAnnouncementData,
} from "../../../src/modules/announcements/application/ports/announcement-repository";

export class InMemoryAnnouncementRepository implements AnnouncementRepository {
  private readonly byId = new Map<string, AnnouncementRecord>();

  seed(record: AnnouncementRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateAnnouncementData): Promise<AnnouncementRecord> {
    const now = new Date();
    const record: AnnouncementRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      content: data.content,
      priority: data.priority ?? "MEDIUM",
      audienceType: data.audienceType,
      audienceValue: data.audienceValue ?? null,
      publishAt: data.publishAt ?? now,
      expiresAt: data.expiresAt ?? null,
      authorId: data.authorId,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<AnnouncementRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private mustGet(id: string): AnnouncementRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No announcement with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateAnnouncementData): Promise<AnnouncementRecord> {
    const existing = this.mustGet(id);
    const updated: AnnouncementRecord = {
      ...existing,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.audienceType !== undefined ? { audienceType: data.audienceType } : {}),
      ...(data.audienceValue !== undefined ? { audienceValue: data.audienceValue } : {}),
      ...(data.publishAt !== undefined ? { publishAt: data.publishAt } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async search(filters: AnnouncementFilters, sort: AnnouncementSort, pagination: PaginationInput): Promise<PaginatedResult<AnnouncementRecord>> {
    let items = [...this.byId.values()].filter((a) => {
      if (filters.audienceType && a.audienceType !== filters.audienceType) return false;
      if (filters.authorId && a.authorId !== filters.authorId) return false;
      return true;
    });

    items = items.sort((a, b) => {
      const cmp = a[sort.field].getTime() - b[sort.field].getTime();
      return sort.direction === "asc" ? cmp : -cmp;
    });

    const total = items.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const page = items.slice(start, start + pagination.pageSize);
    return { items: page, total, page: pagination.page, pageSize: pagination.pageSize };
  }
}
