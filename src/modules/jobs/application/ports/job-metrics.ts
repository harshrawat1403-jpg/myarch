/**
 * Metrics hook, deliberately separate from JobLogger even though the
 * default implementation (infrastructure/console-job-metrics-recorder.ts)
 * also just writes to the console for Version 1.0 — logging is
 * "what happened," metrics is "counters/timers a real metrics backend
 * would aggregate." Swapping in Prometheus/StatsD/CloudWatch later is a new
 * JobMetricsRecorder implementation; JobWorker and every handler are
 * unaffected.
 */
export interface JobMetricsRecorder {
  recordJobStarted(type: string): void;
  recordJobCompleted(type: string, executionTimeMs: number): void;
  recordJobFailed(type: string, executionTimeMs: number): void;
  recordJobRetried(type: string): void;
}
