import crypto from "node:crypto";
import type {
  PublicationExportFileRecord,
  PublicationExportFileRepository,
  PublicationImageFileRecord,
  PublicationImageFileRepository,
} from "../../../src/modules/publications/application/ports/publication-file-repository";

export class InMemoryPublicationImageFileRepository implements PublicationImageFileRepository {
  private readonly byId = new Map<string, PublicationImageFileRecord>();

  async create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<PublicationImageFileRecord> {
    const record: PublicationImageFileRecord = { id: crypto.randomUUID(), storageKey: input.storageKey, mimeType: input.mimeType };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(fileId: string): Promise<PublicationImageFileRecord | null> {
    return this.byId.get(fileId) ?? null;
  }

  async delete(fileId: string): Promise<void> {
    this.byId.delete(fileId);
  }
}

export class InMemoryPublicationExportFileRepository implements PublicationExportFileRepository {
  private readonly byId = new Map<string, PublicationExportFileRecord>();

  async create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<PublicationExportFileRecord> {
    const record: PublicationExportFileRecord = { id: crypto.randomUUID(), storageKey: input.storageKey, mimeType: input.mimeType };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(fileId: string): Promise<PublicationExportFileRecord | null> {
    return this.byId.get(fileId) ?? null;
  }
}
