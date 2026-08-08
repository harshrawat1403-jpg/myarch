import type { BulkImportRun as PrismaBulkImportRun, Prisma, PrismaClient } from "@prisma/client";
import type { BulkImportRowError, BulkImportRunRecord, BulkImportRunStatus } from "../domain/entities";
import type {
  BulkImportRunRepository,
  CreateBulkImportRunData,
} from "../application/ports/bulk-import-run-repository";

export class PrismaBulkImportRunRepository implements BulkImportRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateBulkImportRunData): Promise<BulkImportRunRecord> {
    const row = await this.prisma.bulkImportRun.create({
      data: {
        actorUserId: data.actorUserId,
        batchId: data.batchId,
        totalRows: data.totalRows,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<BulkImportRunRecord | null> {
    const row = await this.prisma.bulkImportRun.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async markRunning(id: string): Promise<BulkImportRunRecord> {
    const row = await this.prisma.bulkImportRun.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return toDomain(row);
  }

  async recordRowSuccess(id: string): Promise<BulkImportRunRecord> {
    const row = await this.prisma.bulkImportRun.update({
      where: { id },
      data: { processedRows: { increment: 1 }, successCount: { increment: 1 } },
    });
    return toDomain(row);
  }

  async recordRowFailure(id: string, rowError: BulkImportRowError): Promise<BulkImportRunRecord> {
    // Read-modify-write on the JSON errorReport column — safe because a
    // single BulkImportRun is only ever processed by one job, executed
    // sequentially by one worker at a time (the job queue's atomic
    // FOR UPDATE SKIP LOCKED claim rules out a second concurrent writer).
    const existing = await this.prisma.bulkImportRun.findUniqueOrThrow({ where: { id } });
    const errorReport = [...(existing.errorReport as unknown as BulkImportRowError[]), rowError];
    const row = await this.prisma.bulkImportRun.update({
      where: { id },
      data: {
        processedRows: { increment: 1 },
        failureCount: { increment: 1 },
        errorReport: errorReport as unknown as Prisma.InputJsonValue,
      },
    });
    return toDomain(row);
  }

  async complete(
    id: string,
    status: Extract<BulkImportRunStatus, "COMPLETED" | "COMPLETED_WITH_ERRORS">,
  ): Promise<BulkImportRunRecord> {
    const row = await this.prisma.bulkImportRun.update({
      where: { id },
      data: { status, completedAt: new Date() },
    });
    return toDomain(row);
  }

  async markFailed(id: string, message: string): Promise<BulkImportRunRecord> {
    const existing = await this.prisma.bulkImportRun.findUniqueOrThrow({ where: { id } });
    const errorReport = [
      ...(existing.errorReport as unknown as BulkImportRowError[]),
      { row: 0, error: message },
    ];
    const row = await this.prisma.bulkImportRun.update({
      where: { id },
      data: { status: "FAILED", completedAt: new Date(), errorReport: errorReport as unknown as Prisma.InputJsonValue },
    });
    return toDomain(row);
  }
}

function toDomain(row: PrismaBulkImportRun): BulkImportRunRecord {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    batchId: row.batchId,
    status: row.status,
    totalRows: row.totalRows,
    processedRows: row.processedRows,
    successCount: row.successCount,
    failureCount: row.failureCount,
    errorReport: row.errorReport as unknown as BulkImportRowError[],
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}
