import crypto from "node:crypto";
import type { MeetingFilters, MeetingRecord, MeetingSort, MeetingStatus, PaginatedResult, PaginationInput } from "../../../src/modules/meetings";
import type { CreateMeetingData, MeetingRepository, UpdateMeetingData } from "../../../src/modules/meetings/application/ports/meeting-repository";

export class InMemoryMeetingRepository implements MeetingRepository {
  private readonly byId = new Map<string, MeetingRecord>();

  seed(record: MeetingRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateMeetingData): Promise<MeetingRecord> {
    const now = new Date();
    const record: MeetingRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      agenda: data.agenda ?? null,
      startAt: data.startAt,
      venueOrLink: data.venueOrLink ?? null,
      status: "SCHEDULED",
      organizerId: data.organizerId,
      committeeId: data.committeeId ?? null,
      notes: null,
      decisions: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<MeetingRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private mustGet(id: string): MeetingRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No meeting with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateMeetingData): Promise<MeetingRecord> {
    const existing = this.mustGet(id);
    const updated: MeetingRecord = {
      ...existing,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.agenda !== undefined ? { agenda: data.agenda } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
      ...(data.venueOrLink !== undefined ? { venueOrLink: data.venueOrLink } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.decisions !== undefined ? { decisions: data.decisions } : {}),
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: MeetingStatus): Promise<MeetingRecord> {
    const existing = this.mustGet(id);
    const updated: MeetingRecord = { ...existing, status };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: MeetingFilters, sort: MeetingSort, pagination: PaginationInput): Promise<PaginatedResult<MeetingRecord>> {
    let items = [...this.byId.values()].filter((meeting) => {
      if (filters.status && meeting.status !== filters.status) return false;
      if (filters.organizerId && meeting.organizerId !== filters.organizerId) return false;
      if (filters.committeeId && meeting.committeeId !== filters.committeeId) return false;
      if (filters.involvingUserId && meeting.organizerId !== filters.involvingUserId) return false;
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
