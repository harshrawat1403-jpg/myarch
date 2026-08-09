import type { Prisma, PrismaClient } from "@prisma/client";
import type { PublicationContent } from "../domain/blocks";
import type { PublicationVersionRecord } from "../domain/entities";
import type { PublicationVersionRepository } from "../application/ports/publication-version-repository";

type VersionRow = Awaited<ReturnType<PrismaClient["publicationVersion"]["findUniqueOrThrow"]>>;

function toDomain(row: VersionRow): PublicationVersionRecord {
  return {
    id: row.id,
    publicationId: row.publicationId,
    versionNumber: row.versionNumber,
    content: row.contentJsonSnapshot as unknown as PublicationContent,
    label: row.label,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}

export class PrismaPublicationVersionRepository implements PublicationVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { publicationId: string; content: PublicationContent; label: string | null; createdByUserId: string }): Promise<PublicationVersionRecord> {
    // Append-only, sequential per publication — computed inside the same
    // transaction as the insert so two concurrent Publish actions can never
    // collide on the same versionNumber.
    const row = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.publicationVersion.findFirst({
        where: { publicationId: input.publicationId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
      return tx.publicationVersion.create({
        data: {
          publicationId: input.publicationId,
          versionNumber: nextVersionNumber,
          contentJsonSnapshot: input.content as unknown as Prisma.InputJsonValue,
          label: input.label,
          createdByUserId: input.createdByUserId,
        },
      });
    });
    return toDomain(row);
  }

  async listForPublication(publicationId: string): Promise<PublicationVersionRecord[]> {
    const rows = await this.prisma.publicationVersion.findMany({
      where: { publicationId },
      orderBy: { versionNumber: "desc" },
    });
    return rows.map(toDomain);
  }

  async findByVersionNumber(publicationId: string, versionNumber: number): Promise<PublicationVersionRecord | null> {
    const row = await this.prisma.publicationVersion.findUnique({
      where: { publicationId_versionNumber: { publicationId, versionNumber } },
    });
    return row ? toDomain(row) : null;
  }
}
