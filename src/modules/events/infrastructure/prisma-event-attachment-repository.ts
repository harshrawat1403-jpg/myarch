import type { PrismaClient } from "@prisma/client";
import type { EventAttachmentRecord } from "../domain/entities";
import type { AddEventAttachmentInput, EventAttachmentRepository } from "../application/ports/event-attachment-repository";

export class PrismaEventAttachmentRepository implements EventAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: AddEventAttachmentInput): Promise<EventAttachmentRecord> {
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
      return tx.eventAttachment.create({
        data: { eventId: input.eventId, fileId: file.id, kind: input.kind },
        include: { file: true },
      });
    });

    return {
      id: row.id,
      eventId: row.eventId,
      fileId: row.fileId,
      kind: row.kind,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    };
  }

  async listForEvent(eventId: string): Promise<EventAttachmentRecord[]> {
    const rows = await this.prisma.eventAttachment.findMany({
      where: { eventId },
      include: { file: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      fileId: row.fileId,
      kind: row.kind,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<(EventAttachmentRecord & { storageKey: string }) | null> {
    const row = await this.prisma.eventAttachment.findUnique({ where: { id }, include: { file: true } });
    if (!row) return null;
    return {
      id: row.id,
      eventId: row.eventId,
      fileId: row.fileId,
      kind: row.kind,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
      storageKey: row.file.storageKey,
    };
  }
}
