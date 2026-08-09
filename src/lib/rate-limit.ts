/**
 * Framework-free token-bucket algorithm (V4.0 A2, docs/planning/V4_0_PRD.md
 * §18). Pure and DB-free by design so the interesting math is unit-testable
 * without Postgres — src/lib/prisma-rate-limiter.ts is a thin I/O wrapper
 * around this that persists TokenBucketState per key.
 */

export interface TokenBucketState {
  readonly tokens: number;
  readonly lastRefillAt: Date;
}

export interface TokenBucketConfig {
  /** Maximum tokens the bucket can hold — also the burst size. */
  readonly capacity: number;
  readonly refillRatePerSecond: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterMs?: number;
}

export interface RateLimiter {
  consume(key: string, cost?: number): Promise<RateLimitResult>;
}

/**
 * `state` is the bucket's last persisted reading, or `null` for a key seen
 * for the first time (treated as a full bucket). Returns both the outcome
 * and the state the caller must persist next — a denied request still
 * persists the refilled-but-unconsumed token count, so the bucket keeps
 * refilling correctly between attempts.
 */
export function consumeTokenBucket(
  state: TokenBucketState | null,
  config: TokenBucketConfig,
  cost: number,
  now: Date,
): { result: RateLimitResult; nextState: TokenBucketState } {
  const previousTokens = state?.tokens ?? config.capacity;
  const previousRefillAt = state?.lastRefillAt ?? now;
  const elapsedSeconds = Math.max(0, (now.getTime() - previousRefillAt.getTime()) / 1000);
  const refilled = Math.min(config.capacity, previousTokens + elapsedSeconds * config.refillRatePerSecond);

  if (refilled >= cost) {
    return {
      result: { allowed: true },
      nextState: { tokens: refilled - cost, lastRefillAt: now },
    };
  }

  const deficit = cost - refilled;
  const retryAfterMs = Math.ceil((deficit / config.refillRatePerSecond) * 1000);
  return {
    result: { allowed: false, retryAfterMs },
    nextState: { tokens: refilled, lastRefillAt: now },
  };
}
