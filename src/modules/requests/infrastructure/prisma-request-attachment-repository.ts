import type { PrismaClient } from "@prisma/client";
import type { RequestAttachmentRecord } from "../domain/entities";
import type { AddRequestAttachmentInput, RequestAttachmentRepository } from "../application/ports/request-attachment-repository";

export class PrismaRequestAttachmentRepository implements RequestAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: AddRequestAttachmentInput): Promise<RequestAttachmentRecord> {
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
      return tx.requestAttachment.create({
        data: { requestId: input.requestId, fileId: file.id },
        include: { file: true },
      });
    });

    return {
      id: row.id,
      requestId: row.requestId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    };
  }

  async listForRequest(requestId: string): Promise<RequestAttachmentRecord[]> {
    const rows = await this.prisma.requestAttachment.findMany({
      where: { requestId },
      include: { file: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      requestId: row.requestId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<(RequestAttachmentRecord & { storageKey: string }) | null> {
    const row = await this.prisma.requestAttachment.findUnique({ where: { id }, include: { file: true } });
    if (!row) return null;
    return {
      id: row.id,
      requestId: row.requestId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
      storageKey: row.file.storageKey,
    };
  }
}
