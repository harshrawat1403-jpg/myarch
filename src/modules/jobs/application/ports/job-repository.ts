import type { JobRecord, JobType } from "../../domain/entities";

/**
 * Persistence for the generic job queue. `claimBatch` is the one method
 * with a real correctness requirement beyond CRUD: it must atomically
 * transition a batch of eligible rows to PROCESSING and return exactly the
 * rows it claimed, such that two workers calling claimBatch concurrently
 * never receive the same job (duplicate-execution prevention). The Prisma
 * implementation uses `SELECT ... FOR UPDATE SKIP LOCKED` inside the same
 * UPDATE statement to guarantee this at the database level — see
 * infrastructure/prisma-job-repository.ts.
 */
export interface JobRepository {
  enqueue(input: {
    type: JobType;
    payload: Record<string, unknown>;
    runAt: Date;
    maxAttempts: number;
  }): Promise<JobRecord>;

  /**
   * Atomically claims up to `batchSize` eligible jobs (status PENDING or
   * RETRYING, runAt <= now, type in `types`), marking them PROCESSING and
   * incrementing `attempts`, and returns exactly the rows claimed.
   */
  claimBatch(input: {
    workerId: string;
    types: readonly JobType[];
    batchSize: number;
    now: Date;
  }): Promise<JobRecord[]>;

  markCompleted(id: string, executionTimeMs: number): Promise<void>;

  markRetrying(
    id: string,
    input: { errorMessage: string; nextRetryAt: Date; executionTimeMs: number },
  ): Promise<void>;

  markFailed(id: string, input: { errorMessage: string; executionTimeMs: number }): Promise<void>;

  cancel(id: string): Promise<void>;

  findById(id: string): Promise<JobRecord | null>;
}
