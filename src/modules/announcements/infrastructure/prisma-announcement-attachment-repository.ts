import type { PrismaClient } from "@prisma/client";
import type { AnnouncementAttachmentRecord } from "../domain/entities";
import type {
  AddAnnouncementAttachmentInput,
  AnnouncementAttachmentRepository,
} from "../application/ports/announcement-attachment-repository";

export class PrismaAnnouncementAttachmentRepository implements AnnouncementAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: AddAnnouncementAttachmentInput): Promise<AnnouncementAttachmentRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const file = await tx.fileAsset.create({
        data: {
          ownerUserId: input.ownerUserId,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          classification: "PUBLIC",
        },
      });
      return tx.announcementAttachment.create({
        data: { announcementId: input.announcementId, fileId: file.id },
        include: { file: true },
      });
    });

    return {
      id: row.id,
      announcementId: row.announcementId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    };
  }

  async listForAnnouncement(announcementId: string): Promise<AnnouncementAttachmentRecord[]> {
    const rows = await this.prisma.announcementAttachment.findMany({
      where: { announcementId },
      include: { file: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      announcementId: row.announcementId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<(AnnouncementAttachmentRecord & { storageKey: string }) | null> {
    const row = await this.prisma.announcementAttachment.findUnique({ where: { id }, include: { file: true } });
    if (!row) return null;
    return {
      id: row.id,
      announcementId: row.announcementId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
      storageKey: row.file.storageKey,
    };
  }
}
