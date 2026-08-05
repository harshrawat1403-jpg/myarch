import type { JobRecord, JobType } from "../../../src/modules/jobs";
import type { JobRepository } from "../../../src/modules/jobs/application/ports/job-repository";

/**
 * Simulates the atomic-claim contract PrismaJobRepository implements via
 * `FOR UPDATE SKIP LOCKED`: claimBatch synchronously flips claimed rows to
 * PROCESSING before returning, so a second claimBatch call — even before
 * anything else awaits — never returns an already-claimed row. That's the
 * property this fake needs to preserve for tests to meaningfully exercise
 * duplicate-execution prevention without a real Postgres instance.
 */
export class InMemoryJobRepository implements JobRepository {
  readonly jobs: JobRecord[] = [];
  private counter = 0;

  async enqueue(input: {
    type: JobType;
    payload: Record<string, unknown>;
    runAt: Date;
    maxAttempts: number;
  }): Promise<JobRecord> {
    const now = new Date();
    const record: JobRecord = {
      id: `job-${++this.counter}`,
      type: input.type,
      payload: input.payload,
      status: "PENDING",
      attempts: 0,
      maxAttempts: input.maxAttempts,
      runAt: input.runAt,
      lastAttemptAt: null,
      nextRetryAt: null,
      completedAt: null,
      errorMessage: null,
      executionTimeMs: null,
      lockedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.push(record);
    return record;
  }

  async claimBatch(input: {
    workerId: string;
    types: readonly JobType[];
    batchSize: number;
    now: Date;
  }): Promise<JobRecord[]> {
    const eligible = this.jobs
      .filter(
        (job) =>
          (job.status === "PENDING" || job.status === "RETRYING") &&
          job.runAt.getTime() <= input.now.getTime() &&
          input.types.includes(job.type),
      )
      .sort((a, b) => a.runAt.getTime() - b.runAt.getTime())
      .slice(0, input.batchSize);

    for (const job of eligible) {
      this.replace(job.id, {
        status: "PROCESSING",
        attempts: job.attempts + 1,
        lastAttemptAt: input.now,
        lockedBy: input.workerId,
      });
    }

    return eligible.map((job) => this.mustFind(job.id));
  }

  async markCompleted(id: string, executionTimeMs: number): Promise<void> {
    this.replace(id, {
      status: "COMPLETED",
      completedAt: new Date(),
      executionTimeMs,
      errorMessage: null,
      lockedBy: null,
    });
  }

  async markRetrying(
    id: string,
    input: { errorMessage: string; nextRetryAt: Date; executionTimeMs: number },
  ): Promise<void> {
    this.replace(id, {
      status: "RETRYING",
      errorMessage: input.errorMessage,
      nextRetryAt: input.nextRetryAt,
      runAt: input.nextRetryAt,
      executionTimeMs: input.executionTimeMs,
      lockedBy: null,
    });
  }

  async markFailed(id: string, input: { errorMessage: string; executionTimeMs: number }): Promise<void> {
    this.replace(id, {
      status: "FAILED",
      errorMessage: input.errorMessage,
      executionTimeMs: input.executionTimeMs,
      completedAt: new Date(),
      lockedBy: null,
    });
  }

  async cancel(id: string): Promise<void> {
    this.replace(id, { status: "CANCELLED", completedAt: new Date(), lockedBy: null });
  }

  async findById(id: string): Promise<JobRecord | null> {
    return this.jobs.find((job) => job.id === id) ?? null;
  }

  private mustFind(id: string): JobRecord {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) throw new Error(`InMemoryJobRepository: job ${id} vanished`);
    return job;
  }

  private replace(id: string, patch: Partial<JobRecord>): void {
    const index = this.jobs.findIndex((job) => job.id === id);
    if (index === -1) return;
    this.jobs[index] = { ...this.jobs[index], ...patch } as JobRecord;
  }
}
