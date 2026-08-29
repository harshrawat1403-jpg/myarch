import type { PrismaClient } from "@prisma/client";
import type { ContentOverrideFileRecord } from "../application/ports/content-override-file-repository";

export class PrismaContentOverrideFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<ContentOverrideFileRecord> {
    const row = await this.prisma.fileAsset.create({
      data: {
        ownerUserId: input.ownerUserId,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        classification: "PUBLIC",
      },
    });
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType };
  }
}
