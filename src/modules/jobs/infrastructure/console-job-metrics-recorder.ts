import type { JobMetricsRecorder } from "../application/ports/job-metrics";

/**
 * Version 1.0 default metrics hook: logs each metric event as a structured
 * console line. There is no real metrics backend wired up yet (Prometheus/
 * StatsD/CloudWatch) — this exists so JobWorker always has *something* to
 * call, and so the hook points are exercised from day one. Replacing this
 * with a real metrics client later is a new JobMetricsRecorder
 * implementation; JobWorker is unaffected.
 */
export class ConsoleJobMetricsRecorder implements JobMetricsRecorder {
  recordJobStarted(type: string): void {
    this.write("job_started", { type });
  }

  recordJobCompleted(type: string, executionTimeMs: number): void {
    this.write("job_completed", { type, executionTimeMs });
  }

  recordJobFailed(type: string, executionTimeMs: number): void {
    this.write("job_failed", { type, executionTimeMs });
  }

  recordJobRetried(type: string): void {
    this.write("job_retried", { type });
  }

  private write(metric: string, fields: Record<string, unknown>): void {
    console.log(JSON.stringify({ metric, timestamp: new Date().toISOString(), ...fields }));
  }
}
