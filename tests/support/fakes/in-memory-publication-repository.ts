import crypto from "node:crypto";
import type { PublicationRecord, PublicationStatus, PublicationSummaryDTO } from "../../../src/modules/publications";
import type {
  CreatePublicationInput,
  PublicationRepository,
  PublicationSearchFilters,
} from "../../../src/modules/publications/application/ports/publication-repository";

export class InMemoryPublicationRepository implements PublicationRepository {
  private readonly byId = new Map<string, PublicationRecord>();

  seed(record: PublicationRecord): void {
    this.byId.set(record.id, record);
  }

  async create(input: CreatePublicationInput): Promise<PublicationRecord> {
    const now = new Date();
    const record: PublicationRecord = {
      id: crypto.randomUUID(),
      title: input.title,
      type: input.type,
      status: "DRAFT",
      templateId: input.templateId,
      content: input.content,
      pageSize: input.pageSize,
      customDimensions: null,
      version: 1,
      createdByUserId: input.createdByUserId,
      lastEditedByUserId: input.createdByUserId,
      lastEditedAt: now,
      createdAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<PublicationRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async search(filters: PublicationSearchFilters): Promise<PublicationSummaryDTO[]> {
    return [...this.byId.values()]
      .filter((p) => (filters.status ? p.status === filters.status : true))
      .filter((p) => (filters.type ? p.type === filters.type : true))
      .map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        status: p.status,
        templateName: null,
        lastEditedAt: p.lastEditedAt,
        createdAt: p.createdAt,
      }));
  }

  async updateContent(
    id: string,
    input: { title: string; content: PublicationRecord["content"]; pageSize: PublicationRecord["pageSize"]; expectedVersion: number; editedByUserId: string },
  ): Promise<PublicationRecord | null> {
    const existing = this.byId.get(id);
    if (!existing) return null;
    if (existing.version !== input.expectedVersion) return null;

    const updated: PublicationRecord = {
      ...existing,
      title: input.title,
      content: input.content,
      pageSize: input.pageSize,
      version: existing.version + 1,
      lastEditedByUserId: input.editedByUserId,
      lastEditedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: PublicationStatus): Promise<PublicationRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No publication with id ${id}`);
    const updated: PublicationRecord = { ...existing, status };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
