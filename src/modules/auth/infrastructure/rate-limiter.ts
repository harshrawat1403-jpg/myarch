/**
 * Fixed-window rate limiter for login/password-reset endpoints
 * (docs/security/14_Security_Architecture.md, docs/03_Functional_Requirements.md
 * FR-AUTH-05). In-memory by design: Phase 1 runs as a single application
 * instance (docs/architecture/05_System_Architecture.md's deployment
 * topology), so a process-local counter is correct at this scale. If the
 * platform is ever horizontally scaled, this must move to a shared store
 * (e.g. Redis) — see docs/architecture/06_Technology_Stack.md Future
 * Considerations, which already anticipates outgrowing in-process state.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export class InMemoryRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly options: {
      windowMs: number;
      maxAttempts: number;
    },
  ) {}

  consume(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (recent.length >= this.options.maxAttempts) {
      const oldest = recent[0]!;
      this.hits.set(key, recent);
      return { allowed: false, retryAfterMs: oldest + this.options.windowMs - now };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true };
  }

  /** Test/ops utility — not used by production request handling. */
  reset(): void {
    this.hits.clear();
  }
}
