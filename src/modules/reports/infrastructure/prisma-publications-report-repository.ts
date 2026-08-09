import type { Prisma, PrismaClient } from "@prisma/client";
import type { PublicationsUsageReportFilters } from "../domain/entities";
import type { PublicationsReportRepository, PublicationsUsageCounts } from "../application/ports/publications-report-repository";

export class PrismaPublicationsReportRepository implements PublicationsReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(filters: PublicationsUsageReportFilters): Promise<PublicationsUsageCounts> {
    const where: Prisma.PublicationWhereInput = filters.type ? { type: filters.type } : {};

    const [totalPublications, statusGroups, typeGroups, exportFormatGroups, exportStatusGroups] = await Promise.all([
      this.prisma.publication.count({ where }),
      this.prisma.publication.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.publication.groupBy({ by: ["type"], where, _count: { _all: true } }),
      this.prisma.publicationExport.groupBy({ by: ["format"], where: { publication: where }, _count: { _all: true } }),
      this.prisma.publicationExport.groupBy({ by: ["status"], where: { publication: where }, _count: { _all: true } }),
    ]);

    return {
      totalPublications,
      byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      byType: typeGroups.map((g) => ({ type: g.type, count: g._count._all })),
      exportsByFormat: exportFormatGroups.map((g) => ({ format: g.format, count: g._count._all })),
      exportsByStatus: exportStatusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    };
  }
}
