import type { JobType } from "../domain/entities";

export interface DispatchOptions {
  /** Defaults to now — pass a future date to schedule a delayed/reminder job. */
  runAt?: Date;
  /** Defaults to DEFAULT_MAX_ATTEMPTS (domain/entities.ts). */
  maxAttempts?: number;
}

/**
 * The "job dispatcher" named in the architecture requirement, and the only
 * thing another module (e.g. notifications) depends on to enqueue work. It
 * knows nothing about workers, retries, or handlers — dispatching is just
 * "durably record that this work should happen."
 */
export interface JobDispatcher {
  dispatch(type: JobType, payload: Record<string, unknown>, options?: DispatchOptions): Promise<{ jobId: string }>;
}
