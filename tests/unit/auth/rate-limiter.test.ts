/**
 * InMemoryRateLimiter had no dedicated test coverage before the Production
 * Readiness Sprint, despite backing FR-AUTH-05/NFR-SEC-07 ("rate-limited
 * per account AND per IP"). These tests cover the primitive directly; the
 * login route's specific two-key (email + IP) usage of it
 * (src/modules/auth/presentation/route-handlers/login.ts) is not
 * separately integration-tested because that route is bound directly to
 * the real Prisma-backed composition root, and no live database is
 * available in this environment (the same standing limitation as every
 * other Prisma-backed route in this project) — reviewed by inspection
 * instead, and covered here at the level of the isolation guarantee it
 * depends on: two different keys never interfere with each other.
 */
import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "../../../src/modules/auth/infrastructure/rate-limiter";

describe("InMemoryRateLimiter", () => {
  it("allows attempts up to maxAttempts within the window", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxAttempts: 3 });
    expect(limiter.consume("k").allowed).toBe(true);
    expect(limiter.consume("k").allowed).toBe(true);
    expect(limiter.consume("k").allowed).toBe(true);
  });

  it("rejects once maxAttempts is exceeded within the window, with a positive retryAfterMs", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxAttempts: 2 });
    limiter.consume("k");
    limiter.consume("k");
    const blocked = limiter.consume("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different keys completely independently — the isolation the per-account/per-IP fix depends on", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxAttempts: 1 });
    expect(limiter.consume("login:email:alice@vnit.ac.in").allowed).toBe(true);
    // A different key (e.g. a different email, or an IP key) must not be
    // affected by another key's exhausted attempts.
    expect(limiter.consume("login:ip:10.0.0.1").allowed).toBe(true);
    // But the first key is now exhausted on its own.
    expect(limiter.consume("login:email:alice@vnit.ac.in").allowed).toBe(false);
  });

  it("allows an attempt again once the window has slid past the oldest recorded hit", async () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 20, maxAttempts: 1 });
    expect(limiter.consume("k").allowed).toBe(true);
    expect(limiter.consume("k").allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(limiter.consume("k").allowed).toBe(true);
  });

  it("reset() clears all recorded attempts", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxAttempts: 1 });
    limiter.consume("k");
    expect(limiter.consume("k").allowed).toBe(false);
    limiter.reset();
    expect(limiter.consume("k").allowed).toBe(true);
  });
});
