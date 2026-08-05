import { randomUUID } from "crypto";
import type { JobRecord } from "../../domain/entities";
import { computeBackoffMs, shouldRetry } from "../../domain/retry-policy";
import type { JobRepository } from "../ports/job-repository";
import type { JobLogger } from "../ports/job-logger";
import type { JobMetricsRecorder } from "../ports/job-metrics";
import { JobRegistry } from "../job-registry";

export interface JobWorkerOptions {
  workerId?: string;
  /** How long to wait before polling again when a poll claimed nothing. Default 2000ms. */
  pollIntervalMs?: number;
  /** Max jobs claimed per poll. Default 5. */
  batchSize?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls the job queue, atomically claims a batch, and executes each job
 * sequentially against whatever handler JobRegistry has registered for its
 * type — the "worker process" named in the architecture requirement.
 *
 * Sequential (not concurrent) execution within a batch is a deliberate
 * Version 1.0 simplification: it keeps graceful shutdown trivial to reason
 * about (at most one job is ever "in flight," so stop() only has to let
 * that one job finish) and avoids one worker hammering a single downstream
 * dependency — like an email provider — with a burst of concurrent calls.
 * Running multiple JobWorker instances (in separate processes) is how this
 * scales horizontally instead; nothing here assumes a single worker exists,
 * since claimBatch's atomicity is what actually prevents double-execution.
 *
 * Unknown job types (no registered handler) are dead-lettered immediately
 * — retrying can never fix a missing handler.
 */
export class JobWorker {
  private readonly workerId: string;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private stopRequested = false;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly deps: {
      jobRepository: JobRepository;
      jobRegistry: JobRegistry;
      logger: JobLogger;
      metrics: JobMetricsRecorder;
    },
    options: JobWorkerOptions = {},
  ) {
    this.workerId = options.workerId ?? `worker-${randomUUID()}`;
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.batchSize = options.batchSize ?? 5;
  }

  getWorkerId(): string {
    return this.workerId;
  }

  isRunning(): boolean {
    return this.loopPromise !== null;
  }

  /** Starts the poll loop. Idempotent — calling start() while already running is a no-op. */
  start(): void {
    if (this.loopPromise) return;
    this.stopRequested = false;
    this.deps.logger.info("worker.started", { workerId: this.workerId });
    this.loopPromise = this.loop();
  }

  private async loop(): Promise<void> {
    while (!this.stopRequested) {
      const claimed = await this.pollOnce();
      if (this.stopRequested) break;
      if (claimed === 0) {
        await sleep(this.pollIntervalMs);
      }
    }
    this.deps.logger.info("worker.stopped", { workerId: this.workerId });
    this.loopPromise = null;
  }

  /**
   * Claims and executes one batch. Exposed publicly (not just used
   * internally by the loop) so tests can drive the worker deterministically
   * without relying on real timers.
   */
  async pollOnce(): Promise<number> {
    const types = this.deps.jobRegistry.registeredTypes();
    if (types.length === 0) {
      return 0;
    }

    const jobs = await this.deps.jobRepository.claimBatch({
      workerId: this.workerId,
      types,
      batchSize: this.batchSize,
      now: new Date(),
    });

    for (const job of jobs) {
      if (this.stopRequested) break;
      await this.executeJob(job);
    }

    return jobs.length;
  }

  private async executeJob(job: JobRecord): Promise<void> {
    const handler = this.deps.jobRegistry.get(job.type);
    const startedAt = Date.now();
    this.deps.logger.info("job.started", { jobId: job.id, type: job.type, attempt: job.attempts, workerId: this.workerId });
    this.deps.metrics.recordJobStarted(job.type);

    if (!handler) {
      const executionTimeMs = Date.now() - startedAt;
      const errorMessage = `No handler registered for job type "${job.type}"`;
      await this.deps.jobRepository.markFailed(job.id, { errorMessage, executionTimeMs });
      this.deps.logger.error("job.no_handler", { jobId: job.id, type: job.type });
      this.deps.metrics.recordJobFailed(job.type, executionTimeMs);
      return;
    }

    try {
      await handler.handle(job.payload);
      const executionTimeMs = Date.now() - startedAt;
      await this.deps.jobRepository.markCompleted(job.id, executionTimeMs);
      this.deps.logger.info("job.completed", { jobId: job.id, type: job.type, executionTimeMs });
      this.deps.metrics.recordJobCompleted(job.type, executionTimeMs);
    } catch (err) {
      const executionTimeMs = Date.now() - startedAt;
      const error = err instanceof Error ? err : new Error(String(err));

      if (shouldRetry(job.attempts, job.maxAttempts)) {
        const delayMs = computeBackoffMs(job.attempts);
        const nextRetryAt = new Date(Date.now() + delayMs);
        await this.deps.jobRepository.markRetrying(job.id, {
          errorMessage: error.message,
          nextRetryAt,
          executionTimeMs,
        });
        this.deps.logger.warn("job.retrying", {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts,
          nextRetryAt: nextRetryAt.toISOString(),
          error: error.message,
        });
        this.deps.metrics.recordJobRetried(job.type);
        return;
      }

      await this.deps.jobRepository.markFailed(job.id, { errorMessage: error.message, executionTimeMs });
      this.deps.logger.error("job.dead_lettered", {
        jobId: job.id,
        type: job.type,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: error.message,
      });
      this.deps.metrics.recordJobFailed(job.type, executionTimeMs);

      if (handler.onPermanentFailure) {
        try {
          await handler.onPermanentFailure(job.payload, error);
        } catch (hookError) {
          this.deps.logger.error("job.permanent_failure_hook_error", {
            jobId: job.id,
            type: job.type,
            error: hookError instanceof Error ? hookError.message : String(hookError),
          });
        }
      }
    }
  }

  /**
   * Requests a graceful shutdown: stops claiming new batches, but awaits
   * whatever job is currently executing (if any) before returning. Safe to
   * call even if the worker was never started.
   */
  async stop(): Promise<void> {
    this.stopRequested = true;
    this.deps.logger.info("worker.stopping", { workerId: this.workerId });
    if (this.loopPromise) {
      await this.loopPromise;
    }
  }
}
