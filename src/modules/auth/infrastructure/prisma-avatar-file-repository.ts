import type { PrismaClient } from "@prisma/client";
import type {
  AvatarFileRecord,
  AvatarFileRepository,
  CreateAvatarFileInput,
} from "../application/ports/avatar-file-repository";

export class PrismaAvatarFileRepository implements AvatarFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAvatarFileInput): Promise<AvatarFileRecord> {
    const row = await this.prisma.fileAsset.create({
      data: {
        ownerUserId: input.ownerUserId,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        classification: "PUBLIC",
      },
    });
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType, ownerUserId: row.ownerUserId };
  }

  async findById(fileId: string): Promise<AvatarFileRecord | null> {
    const row = await this.prisma.fileAsset.findFirst({ where: { id: fileId, usedAsAvatarOf: { isNot: null } } });
    if (!row || row.classification !== "PUBLIC") return null;
    return { id: row.id, storageKey: row.storageKey, mimeType: row.mimeType, ownerUserId: row.ownerUserId };
  }

  async delete(fileId: string): Promise<void> {
    await this.prisma.fileAsset.delete({ where: { id: fileId } }).catch(() => {
      // Already gone — deleting a stale reference during avatar replacement
      // is a no-op, not an error.
    });
  }
}
