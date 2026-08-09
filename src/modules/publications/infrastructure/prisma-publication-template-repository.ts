import type { PrismaClient } from "@prisma/client";
import type { PublicationTemplateRecord, PublicationType } from "../domain/entities";
import type { PublicationTemplateRepository } from "../application/ports/publication-template-repository";

type TemplateRow = Awaited<ReturnType<PrismaClient["publicationTemplate"]["findUniqueOrThrow"]>>;

function toDomain(row: TemplateRow): PublicationTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    thumbnailFileId: row.thumbnailFileId,
    structure: row.structureJson as unknown as PublicationTemplateRecord["structure"],
    status: row.status,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}

export class PrismaPublicationTemplateRepository implements PublicationTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listActive(type?: PublicationType): Promise<PublicationTemplateRecord[]> {
    const rows = await this.prisma.publicationTemplate.findMany({
      where: { status: "ACTIVE", type },
      orderBy: { name: "asc" },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<PublicationTemplateRecord | null> {
    const row = await this.prisma.publicationTemplate.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
