import type { PrismaClient } from "@prisma/client";
import type { PublicationExportFileRecord, PublicationExportFileRepository } from "../application/ports/publication-file-repository";

export class PrismaPublicationExportFileRepository implements PublicationExportFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<PublicationExportFileRecord> {
    const row = await this.prisma.fileAsset.create({
      data: { ownerUserId: input.ownerUserId, storageKey: input.storageKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes, classification: "PRIVATE" },
    });
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType };
  }

  async findById(fileId: string): Promise<PublicationExportFileRecord | null> {
    const row = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!row || row.classification !== "PRIVATE") return null;
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType };
  }
}
