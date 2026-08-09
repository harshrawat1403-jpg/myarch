/**
 * consumeTokenBucket is the framework-free algorithm backing
 * PrismaTokenBucketRateLimiter (V4.0 A2, docs/planning/V4_0_PRD.md §18).
 * Tested here in complete isolation from Postgres — the DB wrapper is a
 * thin read-refill-write around this pure function, so correctness of the
 * math belongs here, not in an integration test.
 */
import { describe, expect, it } from "vitest";
import { consumeTokenBucket, type TokenBucketConfig } from "../../../src/lib/rate-limit";

const CONFIG: TokenBucketConfig = { capacity: 3, refillRatePerSecond: 1 };
const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("consumeTokenBucket", () => {
  it("treats a first-ever key (null state) as a full bucket", () => {
    const { result, nextState } = consumeTokenBucket(null, CONFIG, 1, T0);
    expect(result.allowed).toBe(true);
    expect(nextState.tokens).toBe(2);
  });

  it("allows consumption up to capacity, then denies with a positive retryAfterMs", () => {
    let state = null as ReturnType<typeof consumeTokenBucket>["nextState"] | null;
    for (let i = 0; i < 3; i++) {
      const { result, nextState } = consumeTokenBucket(state, CONFIG, 1, T0);
      expect(result.allowed).toBe(true);
      state = nextState;
    }
    const blocked = consumeTokenBucket(state, CONFIG, 1, T0);
    expect(blocked.result.allowed).toBe(false);
    expect(blocked.result.retryAfterMs).toBeGreaterThan(0);
  });

  it("refills continuously based on elapsed time, capped at capacity", () => {
    const drained = consumeTokenBucket(null, CONFIG, 3, T0);
    expect(drained.result.allowed).toBe(true);
    expect(drained.nextState.tokens).toBe(0);

    const twoSecondsLater = new Date(T0.getTime() + 2000);
    const refilled = consumeTokenBucket(drained.nextState, CONFIG, 1, twoSecondsLater);
    // 0 + 2s * 1 token/s = 2 tokens available, minus the 1 consumed = 1.
    expect(refilled.result.allowed).toBe(true);
    expect(refilled.nextState.tokens).toBe(1);

    const wayLater = new Date(T0.getTime() + 1000 * 60 * 60);
    const capped = consumeTokenBucket(refilled.nextState, CONFIG, 0, wayLater);
    expect(capped.nextState.tokens).toBe(CONFIG.capacity);
  });

  it("a denied request still persists the refilled-but-unconsumed token count", () => {
    const drained = consumeTokenBucket(null, CONFIG, 3, T0);
    const halfSecondLater = new Date(T0.getTime() + 500);
    const blocked = consumeTokenBucket(drained.nextState, CONFIG, 3, halfSecondLater);
    expect(blocked.result.allowed).toBe(false);
    // 0 + 0.5s * 1 token/s = 0.5 tokens refilled, not consumed since denied.
    expect(blocked.nextState.tokens).toBeCloseTo(0.5);
  });

  it("computes retryAfterMs proportional to the remaining deficit and refill rate", () => {
    const drained = consumeTokenBucket(null, CONFIG, 3, T0);
    const blocked = consumeTokenBucket(drained.nextState, CONFIG, 1, T0);
    // Deficit is 1 full token at a rate of 1/s => 1000ms.
    expect(blocked.result.retryAfterMs).toBe(1000);
  });
});
