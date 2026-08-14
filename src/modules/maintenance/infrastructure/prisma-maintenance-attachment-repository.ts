import type { PrismaClient } from "@prisma/client";
import type { MaintenanceAttachmentRecord } from "../domain/entities";
import type {
  AddMaintenanceAttachmentInput,
  MaintenanceAttachmentRepository,
} from "../application/ports/maintenance-attachment-repository";

export class PrismaMaintenanceAttachmentRepository implements MaintenanceAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: AddMaintenanceAttachmentInput): Promise<MaintenanceAttachmentRecord> {
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
      return tx.maintenanceAttachment.create({
        data: { issueId: input.issueId, fileId: file.id },
        include: { file: true },
      });
    });

    return {
      id: row.id,
      issueId: row.issueId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    };
  }

  async listForIssue(issueId: string): Promise<MaintenanceAttachmentRecord[]> {
    const rows = await this.prisma.maintenanceAttachment.findMany({
      where: { issueId },
      include: { file: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      issueId: row.issueId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<(MaintenanceAttachmentRecord & { storageKey: string }) | null> {
    const row = await this.prisma.maintenanceAttachment.findUnique({ where: { id }, include: { file: true } });
    if (!row) return null;
    return {
      id: row.id,
      issueId: row.issueId,
      fileId: row.fileId,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      createdAt: row.createdAt,
      storageKey: row.file.storageKey,
    };
  }
}
