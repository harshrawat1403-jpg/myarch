/**
 * Pure retry/backoff rules — no I/O, no clock reads beyond what's passed in,
 * fully unit-testable without a database or worker.
 */

const BASE_DELAY_MS = 1000; // 1s
const MAX_DELAY_MS = 5 * 60 * 1000; // 5 minutes — caps runaway backoff on a job with a high maxAttempts

export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}

/**
 * Exponential backoff with +/-20% jitter (to avoid many failed jobs from
 * the same incident retrying in lockstep and re-overwhelming a downstream
 * dependency at the same instant). `attempts` is the number of attempts
 * already made (i.e. the attempt that just failed) — attempts=1 after the
 * first failure yields a ~1s (jittered) delay, attempts=2 ~2s, attempts=3
 * ~4s, and so on up to the cap.
 *
 * `random` is injectable purely for deterministic tests; production callers
 * never pass it and get Math.random().
 */
export function computeBackoffMs(attempts: number, random: () => number = Math.random): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** Math.max(attempts - 1, 0), MAX_DELAY_MS);
  const jitterFactor = 0.8 + random() * 0.4; // 80%-120%
  return Math.round(exponential * jitterFactor);
}
