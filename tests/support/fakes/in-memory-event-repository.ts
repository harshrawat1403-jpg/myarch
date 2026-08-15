import crypto from "node:crypto";
import type { EventFilters, EventRecord, EventSort, EventStatus, PaginatedResult, PaginationInput } from "../../../src/modules/events";
import type { CreateEventData, EventRepository, UpdateEventData } from "../../../src/modules/events/application/ports/event-repository";

export class InMemoryEventRepository implements EventRepository {
  private readonly byId = new Map<string, EventRecord>();

  seed(record: EventRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateEventData): Promise<EventRecord> {
    const now = new Date();
    const record: EventRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description ?? null,
      startAt: data.startAt,
      endAt: data.endAt ?? null,
      venue: data.venue ?? null,
      status: "DRAFT",
      organizerId: data.organizerId,
      budgetAmount: data.budgetAmount ?? null,
      budgetNotes: data.budgetNotes ?? null,
      postEventReport: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<EventRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private mustGet(id: string): EventRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No event with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateEventData): Promise<EventRecord> {
    const existing = this.mustGet(id);
    const updated: EventRecord = {
      ...existing,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
      ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
      ...(data.venue !== undefined ? { venue: data.venue } : {}),
      ...(data.budgetAmount !== undefined ? { budgetAmount: data.budgetAmount } : {}),
      ...(data.budgetNotes !== undefined ? { budgetNotes: data.budgetNotes } : {}),
      ...(data.postEventReport !== undefined ? { postEventReport: data.postEventReport } : {}),
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: EventStatus): Promise<EventRecord> {
    const existing = this.mustGet(id);
    const updated: EventRecord = { ...existing, status };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: EventFilters, sort: EventSort, pagination: PaginationInput): Promise<PaginatedResult<EventRecord>> {
    let items = [...this.byId.values()].filter((event) => {
      if (filters.status && event.status !== filters.status) return false;
      if (filters.organizerId && event.organizerId !== filters.organizerId) return false;
      if (filters.ownOrPublishedOnly) {
        const ok = event.organizerId === filters.ownOrPublishedOnly || event.status !== "DRAFT";
        if (!ok) return false;
      }
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
