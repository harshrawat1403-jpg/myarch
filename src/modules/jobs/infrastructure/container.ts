/**
 * Composition root for the jobs module. Unlike auth/notifications, nothing
 * here depends on secrets — JOB_WORKER_POLL_INTERVAL_MS/JOB_WORKER_BATCH_SIZE
 * are plain tuning knobs with defaults — so getEnv() is only touched inside
 * createJobWorker(), and even that call is cheap/side-effect-free (it just
 * reads already-validated config). Nothing here needs the lazy-getter
 * pattern auth/notifications use for their env-derived secrets.
 *
 * `jobRegistry` is exported as a live, mutable singleton — consuming
 * modules (e.g. notifications) call `jobRegistry.register(...)` from their
 * own composition root to add their handler. `jobDispatcher` is the bound,
 * ready-to-use instance other modules call to enqueue work, the same
 * pattern as auth's `withAuth` and notifications' `notificationService`.
 * `createJobWorker()` is a factory, not a singleton — starting a worker is
 * an explicit act performed by a dedicated entrypoint (scripts/run-worker.ts),
 * never an accidental side effect of importing this module from a web
 * request.
 */
import { getEnv } from "@/config/env";
import { prisma } from "@/lib/prisma";
import type { JobDispatcher } from "../application/job-dispatcher";
import { DefaultJobDispatcher } from "../application/default-job-dispatcher";
import { JobRegistry } from "../application/job-registry";
import { JobWorker, type JobWorkerOptions } from "../application/worker/job-worker";
import { PrismaJobRepository } from "./prisma-job-repository";
import { ConsoleJobLogger } from "./console-job-logger";
import { ConsoleJobMetricsRecorder } from "./console-job-metrics-recorder";

const jobRepository = new PrismaJobRepository(prisma);
const logger = new ConsoleJobLogger();
const metrics = new ConsoleJobMetricsRecorder();

/** Shared, mutable handler registry. Other modules register into this. */
export const jobRegistry = new JobRegistry();

/** Bound dispatcher — other modules import this to enqueue jobs. */
export const jobDispatcher: JobDispatcher = new DefaultJobDispatcher({ jobRepository });

/**
 * Builds a JobWorker wired to the shared repository/registry/logger/metrics.
 * Options override the JOB_WORKER_POLL_INTERVAL_MS/JOB_WORKER_BATCH_SIZE env
 * defaults. Callers (scripts/run-worker.ts) are responsible for calling
 * `.start()`/`.stop()` — constructing a worker never starts it.
 */
export function createJobWorker(options: JobWorkerOptions = {}): JobWorker {
  const env = getEnv();
  return new JobWorker(
    { jobRepository, jobRegistry, logger, metrics },
    {
      pollIntervalMs: options.pollIntervalMs ?? env.JOB_WORKER_POLL_INTERVAL_MS,
      batchSize: options.batchSize ?? env.JOB_WORKER_BATCH_SIZE,
      workerId: options.workerId,
    },
  );
}
