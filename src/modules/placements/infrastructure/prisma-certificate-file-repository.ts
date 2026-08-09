import type { PrismaClient } from "@prisma/client";
import type {
  CertificateFileRecord,
  CertificateFileRepository,
  CreateCertificateFileInput,
} from "../application/ports/certificate-file-repository";

export class PrismaCertificateFileRepository implements CertificateFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCertificateFileInput): Promise<CertificateFileRecord> {
    const row = await this.prisma.fileAsset.create({
      data: {
        ownerUserId: input.ownerUserId,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        classification: "PRIVATE",
      },
    });
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType, ownerUserId: row.ownerUserId };
  }

  async findById(fileId: string): Promise<CertificateFileRecord | null> {
    const row = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!row || row.classification !== "PRIVATE") return null;
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType, ownerUserId: row.ownerUserId };
  }

  async delete(fileId: string): Promise<void> {
    await this.prisma.fileAsset.delete({ where: { id: fileId } }).catch(() => {
      // Already gone — deleting a stale reference during certificate replacement is a no-op.
    });
  }
}
