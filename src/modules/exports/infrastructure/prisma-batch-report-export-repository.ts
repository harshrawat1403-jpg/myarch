import type { Prisma, PrismaClient } from "@prisma/client";
import type { BatchReportRow, ExportScope } from "../domain/entities";
import type { BatchReportExportRepository } from "../application/ports/batch-report-export-repository";

type BatchWithStudentStatuses = Prisma.BatchGetPayload<{
  include: { students: { select: { isActive: true } } };
}>;

export class PrismaBatchReportExportRepository implements BatchReportExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetch(scope: ExportScope): Promise<BatchReportRow[]> {
    const batches = await this.prisma.batch.findMany({
      where: scope.batchIds ? { id: { in: [...scope.batchIds] } } : undefined,
      include: { students: { select: { isActive: true } } },
      orderBy: { year: "desc" },
    });

    return batches.map(toRow);
  }
}

export function toRow(batch: BatchWithStudentStatuses): BatchReportRow {
  const totalStudents = batch.students.length;
  const activeStudents = batch.students.filter((student) => student.isActive).length;

  return {
    batchName: batch.name,
    status: batch.status,
    totalStudents,
    activeStudents,
    archivedStudents: totalStudents - activeStudents,
  };
}
