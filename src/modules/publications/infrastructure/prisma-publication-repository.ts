import type { Prisma, PrismaClient } from "@prisma/client";
import type { PublicationContent } from "../domain/blocks";
import type { PublicationRecord, PublicationSummaryDTO } from "../domain/entities";
import type { CreatePublicationInput, PublicationRepository, PublicationSearchFilters } from "../application/ports/publication-repository";

type PublicationRow = Awaited<ReturnType<PrismaClient["publication"]["create"]>>;

function toDomain(row: PublicationRow): PublicationRecord {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    templateId: row.templateId,
    content: row.contentJson as unknown as PublicationContent,
    pageSize: row.pageSize,
    customDimensions: row.customDimensions as unknown as PublicationRecord["customDimensions"],
    version: row.version,
    createdByUserId: row.createdByUserId,
    lastEditedByUserId: row.lastEditedByUserId,
    lastEditedAt: row.lastEditedAt,
    createdAt: row.createdAt,
  };
}

export class PrismaPublicationRepository implements PublicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreatePublicationInput): Promise<PublicationRecord> {
    const row = await this.prisma.publication.create({
      data: {
        title: input.title,
        type: input.type,
        templateId: input.templateId,
        contentJson: input.content as unknown as Prisma.InputJsonValue,
        pageSize: input.pageSize,
        createdByUserId: input.createdByUserId,
        lastEditedByUserId: input.createdByUserId,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<PublicationRecord | null> {
    const row = await this.prisma.publication.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async search(filters: PublicationSearchFilters): Promise<PublicationSummaryDTO[]> {
    const rows = await this.prisma.publication.findMany({
      where: { status: filters.status, type: filters.type },
      orderBy: { lastEditedAt: "desc" },
      include: { template: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      templateName: row.template?.name ?? null,
      lastEditedAt: row.lastEditedAt,
      createdAt: row.createdAt,
    }));
  }

  async updateContent(
    id: string,
    input: { title: string; content: PublicationContent; pageSize: PublicationRecord["pageSize"]; expectedVersion: number; editedByUserId: string },
  ): Promise<PublicationRecord | null> {
    const result = await this.prisma.publication.updateMany({
      where: { id, version: input.expectedVersion },
      data: {
        title: input.title,
        contentJson: input.content as unknown as Prisma.InputJsonValue,
        pageSize: input.pageSize,
        version: { increment: 1 },
        lastEditedByUserId: input.editedByUserId,
        lastEditedAt: new Date(),
      },
    });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  async setStatus(id: string, status: PublicationRecord["status"]): Promise<PublicationRecord> {
    const row = await this.prisma.publication.update({ where: { id }, data: { status } });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.publication.delete({ where: { id } });
  }
}
