import type { Job as PrismaJob, Prisma, PrismaClient } from "@prisma/client";
import type { JobRecord, JobType } from "../domain/entities";
import type { JobRepository } from "../application/ports/job-repository";

function toJobRecord(row: PrismaJob): JobRecord {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload as Record<string, unknown>,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    runAt: row.runAt,
    lastAttemptAt: row.lastAttemptAt,
    nextRetryAt: row.nextRetryAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
    executionTimeMs: row.executionTimeMs,
    lockedBy: row.lockedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueue(input: {
    type: JobType;
    payload: Record<string, unknown>;
    runAt: Date;
    maxAttempts: number;
  }): Promise<JobRecord> {
    const created = await this.prisma.job.create({
      data: {
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
        runAt: input.runAt,
        maxAttempts: input.maxAttempts,
        status: "PENDING",
      },
    });
    return toJobRecord(created);
  }

  /**
   * Atomic claim: `FOR UPDATE SKIP LOCKED` inside the UPDATE's subquery
   * means concurrent callers (multiple worker processes) each lock a
   * disjoint set of candidate rows at the database level — no two workers
   * can ever claim the same job, and a worker never blocks waiting on rows
   * another worker is already mid-claim on. This can't be expressed through
   * Prisma's fluent query builder (there is no `SELECT ... FOR UPDATE SKIP
   * LOCKED` + `UPDATE ... RETURNING` combinator), so it's raw SQL,
   * parameterized (not string-concatenated) to stay injection-safe.
   */
  async claimBatch(input: {
    workerId: string;
    types: readonly JobType[];
    batchSize: number;
    now: Date;
  }): Promise<JobRecord[]> {
    const rows = await this.prisma.$queryRaw<PrismaJob[]>`
      UPDATE "jobs"
      SET "status" = 'PROCESSING',
          "attempts" = "attempts" + 1,
          "lastAttemptAt" = ${input.now},
          "lockedBy" = ${input.workerId},
          "updatedAt" = ${input.now}
      WHERE "id" IN (
        SELECT "id" FROM "jobs"
        WHERE "status" IN ('PENDING', 'RETRYING')
          AND "runAt" <= ${input.now}
          AND "type" = ANY(${input.types})
        ORDER BY "runAt" ASC
        LIMIT ${input.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
    return rows.map(toJobRecord);
  }

  async markCompleted(id: string, executionTimeMs: number): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        executionTimeMs,
        errorMessage: null,
        lockedBy: null,
      },
    });
  }

  async markRetrying(
    id: string,
    input: { errorMessage: string; nextRetryAt: Date; executionTimeMs: number },
  ): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: {
        status: "RETRYING",
        errorMessage: input.errorMessage,
        nextRetryAt: input.nextRetryAt,
        // The claim query filters on runAt, not nextRetryAt — runAt is
        // advanced to the same instant so the retry is actually picked back
        // up no earlier than intended. nextRetryAt is kept as an explicit,
        // human-readable field distinct from "the scheduling column."
        runAt: input.nextRetryAt,
        executionTimeMs: input.executionTimeMs,
        lockedBy: null,
      },
    });
  }

  async markFailed(id: string, input: { errorMessage: string; executionTimeMs: number }): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: input.errorMessage,
        executionTimeMs: input.executionTimeMs,
        completedAt: new Date(),
        lockedBy: null,
      },
    });
  }

  async cancel(id: string): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: { status: "CANCELLED", completedAt: new Date(), lockedBy: null },
    });
  }

  async findById(id: string): Promise<JobRecord | null> {
    const row = await this.prisma.job.findUnique({ where: { id } });
    return row ? toJobRecord(row) : null;
  }
}
