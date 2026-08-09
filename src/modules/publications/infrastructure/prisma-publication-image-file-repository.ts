import type { PrismaClient } from "@prisma/client";
import type { PublicationImageFileRecord, PublicationImageFileRepository } from "../application/ports/publication-file-repository";

export class PrismaPublicationImageFileRepository implements PublicationImageFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<PublicationImageFileRecord> {
    const row = await this.prisma.fileAsset.create({
      data: { ownerUserId: input.ownerUserId, storageKey: input.storageKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes, classification: "PUBLIC" },
    });
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType };
  }

  async findById(fileId: string): Promise<PublicationImageFileRecord | null> {
    const row = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!row || row.classification !== "PUBLIC") return null;
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType };
  }

  async delete(fileId: string): Promise<void> {
    await this.prisma.fileAsset.delete({ where: { id: fileId } }).catch(() => {});
  }
}
