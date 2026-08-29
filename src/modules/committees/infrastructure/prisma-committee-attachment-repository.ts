import type { PrismaClient } from "@prisma/client";
import type { CommitteeAttachmentRecord } from "../domain/entities";
import type {
  AddCommitteeAttachmentInput,
  CommitteeAttachmentRepository,
} from "../application/ports/committee-attachment-repository";

export class PrismaCommitteeAttachmentRepository implements CommitteeAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: AddCommitteeAttachmentInput): Promise<CommitteeAttachmentRecord> {
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
      return tx.committeeAttachment.create({
        data: { committeeId: input.committeeId, fileId: file.id },
        include: { file: true },
      });
    });

    return {
      id: row.id,
      committeeId: row.committeeId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    };
  }

  async listForCommittee(committeeId: string): Promise<CommitteeAttachmentRecord[]> {
    const rows = await this.prisma.committeeAttachment.findMany({
      where: { committeeId },
      include: { file: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      committeeId: row.committeeId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<(CommitteeAttachmentRecord & { storageKey: string }) | null> {
    const row = await this.prisma.committeeAttachment.findUnique({ where: { id }, include: { file: true } });
    if (!row) return null;
    return {
      id: row.id,
      committeeId: row.committeeId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
      storageKey: row.file.storageKey,
    };
  }
}
