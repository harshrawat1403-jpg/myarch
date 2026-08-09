import crypto from "node:crypto";
import type { PublicationExportFormat, PublicationExportRecord } from "../../../src/modules/publications";
import type { PublicationExportRepository } from "../../../src/modules/publications/application/ports/publication-export-repository";

export class InMemoryPublicationExportRepository implements PublicationExportRepository {
  private readonly byId = new Map<string, PublicationExportRecord>();

  async create(input: { publicationId: string; format: PublicationExportFormat; generatedByUserId: string }): Promise<PublicationExportRecord> {
    const record: PublicationExportRecord = {
      id: crypto.randomUUID(),
      publicationId: input.publicationId,
      format: input.format,
      status: "PENDING",
      fileId: null,
      errorMessage: null,
      generatedByUserId: input.generatedByUserId,
      requestedAt: new Date(),
      completedAt: null,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<PublicationExportRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async listForPublication(publicationId: string): Promise<PublicationExportRecord[]> {
    return [...this.byId.values()].filter((e) => e.publicationId === publicationId);
  }

  async markGenerating(id: string): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, status: "GENERATING" });
  }

  async markReady(id: string, fileId: string): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, status: "READY", fileId, completedAt: new Date() });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) this.byId.set(id, { ...existing, status: "FAILED", errorMessage, completedAt: new Date() });
  }
}
