import crypto from "node:crypto";
import type {
  CertificateFileRecord,
  CertificateFileRepository,
  CreateCertificateFileInput,
} from "../../../src/modules/placements/application/ports/certificate-file-repository";

export class InMemoryCertificateFileRepository implements CertificateFileRepository {
  private readonly byId = new Map<string, CertificateFileRecord>();

  async create(input: CreateCertificateFileInput): Promise<CertificateFileRecord> {
    const record: CertificateFileRecord = {
      id: crypto.randomUUID(),
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      ownerUserId: input.ownerUserId,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(fileId: string): Promise<CertificateFileRecord | null> {
    return this.byId.get(fileId) ?? null;
  }

  async delete(fileId: string): Promise<void> {
    this.byId.delete(fileId);
  }
}
