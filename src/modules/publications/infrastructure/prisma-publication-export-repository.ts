import type { PrismaClient } from "@prisma/client";
import type { PublicationExportFormat, PublicationExportRecord } from "../domain/entities";
import type { PublicationExportRepository } from "../application/ports/publication-export-repository";

type ExportRow = Awaited<ReturnType<PrismaClient["publicationExport"]["findUniqueOrThrow"]>>;

function toDomain(row: ExportRow): PublicationExportRecord {
  return {
    id: row.id,
    publicationId: row.publicationId,
    format: row.format,
    status: row.status,
    fileId: row.fileId,
    errorMessage: row.errorMessage,
    generatedByUserId: row.generatedByUserId,
    requestedAt: row.requestedAt,
    completedAt: row.completedAt,
  };
}

export class PrismaPublicationExportRepository implements PublicationExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { publicationId: string; format: PublicationExportFormat; generatedByUserId: string }): Promise<PublicationExportRecord> {
    const row = await this.prisma.publicationExport.create({
      data: { publicationId: input.publicationId, format: input.format, generatedByUserId: input.generatedByUserId, status: "PENDING" },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<PublicationExportRecord | null> {
    const row = await this.prisma.publicationExport.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async listForPublication(publicationId: string): Promise<PublicationExportRecord[]> {
    const rows = await this.prisma.publicationExport.findMany({ where: { publicationId }, orderBy: { requestedAt: "desc" } });
    return rows.map(toDomain);
  }

  async markGenerating(id: string): Promise<void> {
    await this.prisma.publicationExport.update({ where: { id }, data: { status: "GENERATING" } });
  }

  async markReady(id: string, fileId: string): Promise<void> {
    await this.prisma.publicationExport.update({ where: { id }, data: { status: "READY", fileId, completedAt: new Date() } });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.publicationExport.update({ where: { id }, data: { status: "FAILED", errorMessage, completedAt: new Date() } });
  }
}
