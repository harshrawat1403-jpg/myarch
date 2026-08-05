import type { JobMetricsRecorder } from "../../../src/modules/jobs";

export class FakeJobMetricsRecorder implements JobMetricsRecorder {
  readonly started: string[] = [];
  readonly completed: Array<{ type: string; executionTimeMs: number }> = [];
  readonly failed: Array<{ type: string; executionTimeMs: number }> = [];
  readonly retried: string[] = [];

  recordJobStarted(type: string): void {
    this.started.push(type);
  }

  recordJobCompleted(type: string, executionTimeMs: number): void {
    this.completed.push({ type, executionTimeMs });
  }

  recordJobFailed(type: string, executionTimeMs: number): void {
    this.failed.push({ type, executionTimeMs });
  }

  recordJobRetried(type: string): void {
    this.retried.push(type);
  }
}
