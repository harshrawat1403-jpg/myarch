/**
 * Structured logging port. `event` is a short, stable, machine-greppable
 * name ("job.started", "job.retrying", "worker.stopped", ...); `fields` is
 * arbitrary structured context. Swapping the console-based default
 * (infrastructure/console-job-logger.ts) for a real log pipeline (pino,
 * Datadog, CloudWatch) later is a new JobLogger implementation, nothing
 * else changes.
 */
export interface JobLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}
