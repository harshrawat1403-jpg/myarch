import type { PrismaClient } from "@prisma/client";
import { consumeTokenBucket, type RateLimitResult, type RateLimiter, type TokenBucketConfig } from "./rate-limit";

/**
 * Postgres-backed token bucket (V4.0 A2). `SELECT ... FOR UPDATE` locks the
 * row for the transaction's duration so concurrent requests against the same
 * key serialize correctly instead of racing — the same row-locking approach
 * PrismaJobRepository.claimBatch uses, just a plain lock-then-update here
 * rather than `SKIP LOCKED` (blocking briefly on the same key is the correct
 * behavior for a rate limiter, unlike a job queue where it isn't). The
 * `INSERT ... ON CONFLICT DO NOTHING` seed step ensures a row always exists
 * before the lock read, closing the brand-new-key race where two concurrent
 * first requests could otherwise both see "no row" and both win.
 */
export class PrismaTokenBucketRateLimiter implements RateLimiter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: TokenBucketConfig,
  ) {}

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "rate_limit_buckets" ("key", "tokens", "lastRefillAt", "updatedAt")
        VALUES (${key}, ${this.config.capacity}, ${now}, ${now})
        ON CONFLICT ("key") DO NOTHING
      `;

      const rows = await tx.$queryRaw<{ tokens: number; lastRefillAt: Date }[]>`
        SELECT "tokens", "lastRefillAt" FROM "rate_limit_buckets" WHERE "key" = ${key} FOR UPDATE
      `;
      const existing = rows[0]!;
      const { result, nextState } = consumeTokenBucket(
        { tokens: Number(existing.tokens), lastRefillAt: new Date(existing.lastRefillAt) },
        this.config,
        cost,
        now,
      );

      await tx.$executeRaw`
        UPDATE "rate_limit_buckets"
        SET "tokens" = ${nextState.tokens}, "lastRefillAt" = ${nextState.lastRefillAt}, "updatedAt" = ${now}
        WHERE "key" = ${key}
      `;

      return result;
    });
  }
}
