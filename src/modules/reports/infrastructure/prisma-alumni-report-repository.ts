import type { Prisma, PrismaClient } from "@prisma/client";
import type { AlumniReportFilters } from "../domain/entities";
import type { AlumniReportCounts, AlumniReportRepository } from "../application/ports/alumni-report-repository";

export class PrismaAlumniReportRepository implements AlumniReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(filters: AlumniReportFilters): Promise<AlumniReportCounts> {
    const where: Prisma.AlumniProfileWhereInput = {};
    if (filters.graduationYearFrom || filters.graduationYearTo) {
      where.graduationYear = {
        ...(filters.graduationYearFrom ? { gte: filters.graduationYearFrom } : {}),
        ...(filters.graduationYearTo ? { lte: filters.graduationYearTo } : {}),
      };
    }
    if (filters.mentorshipAvailableOnly) where.mentorshipAvailable = true;

    const [totalAlumni, mentorshipAvailableCount, yearGroups] = await Promise.all([
      this.prisma.alumniProfile.count({ where }),
      this.prisma.alumniProfile.count({ where: { ...where, mentorshipAvailable: true } }),
      this.prisma.alumniProfile.groupBy({ by: ["graduationYear"], where, _count: { _all: true }, orderBy: { graduationYear: "desc" } }),
    ]);

    return {
      totalAlumni,
      mentorshipAvailableCount,
      byGraduationYear: yearGroups.map((g) => ({ graduationYear: g.graduationYear, count: g._count._all })),
    };
  }
}
