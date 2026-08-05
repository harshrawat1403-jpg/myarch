/**
 * Public exports of the jobs module — the generic Background Job
 * Processing System. Other modules must import only from here — never
 * reach into jobs/domain, jobs/application, or jobs/infrastructure directly
 * (docs/architecture/07_Repository_Structure.md).
 *
 * Adding a new background job type never requires a change in this module:
 * a consuming module defines its own job-type string, implements
 * JobHandler, and calls `jobRegistry.register(...)` from its own
 * composition root. See src/modules/notifications/infrastructure/container.ts
 * (`registerJobHandlers`) for the reference implementation, and
 * scripts/run-worker.ts for how registration is wired into the worker
 * process.
 */

export type { JobType, JobStatus, JobRecord } from "./domain/entities";
export { DEFAULT_MAX_ATTEMPTS } from "./domain/entities";
export { shouldRetry, computeBackoffMs } from "./domain/retry-policy";

export type { JobHandler } from "./application/job-handler";
export type { JobDispatcher, DispatchOptions } from "./application/job-dispatcher";
export { JobRegistry } from "./application/job-registry";
export { JobWorker } from "./application/worker/job-worker";
export type { JobWorkerOptions } from "./application/worker/job-worker";
export type { JobLogger } from "./application/ports/job-logger";
export type { JobMetricsRecorder } from "./application/ports/job-metrics";
export type { JobRepository } from "./application/ports/job-repository";

// Bound, ready-to-use singletons — the same pattern as auth's `withAuth`
// and notifications' `notificationService`.
export { jobRegistry, jobDispatcher, createJobWorker } from "./infrastructure/container";
