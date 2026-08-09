import { consumeTokenBucket, type RateLimiter, type RateLimitResult, type TokenBucketConfig, type TokenBucketState } from "../../../src/lib/rate-limit";

/** Test double for RateLimiter — same consumeTokenBucket algorithm the real PrismaTokenBucketRateLimiter uses, minus the DB round trip. */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, TokenBucketState>();

  constructor(private readonly config: TokenBucketConfig) {}

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const { result, nextState } = consumeTokenBucket(this.buckets.get(key) ?? null, this.config, cost, new Date());
    this.buckets.set(key, nextState);
    return result;
  }
}
