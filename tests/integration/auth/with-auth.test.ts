/**
 * Integration-level test of the withAuth middleware chain itself:
 * Request → Authentication → JWT Validation → Role Validation → Batch Scope
 * Validation → Business Logic (docs/api/10_API_Architecture.md).
 *
 * Uses a synthetic protected handler rather than a real feature route,
 * since no Student/Batch/Profile module exists yet (Days 3–6 of
 * docs/planning/16_Project_Roadmap.md) — this test's job is to prove the
 * auth foundation's request-handling chain itself, independent of any
 * specific business feature.
 */
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/modules/auth/presentation/with-auth";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import { InMemoryRateLimiter } from "../../support/fakes/in-memory-rate-limiter";

const tokenService = new JwtTokenService({
  accessSecret: "a".repeat(32),
  accessTtl: "15m",
  refreshHashSecret: "b".repeat(32),
});
const withAuth = createAuthMiddleware(tokenService);

function requestWithToken(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/protected", { headers });
}

async function jsonOf(response: Response): Promise<unknown> {
  return response.json();
}

describe("withAuth — Authentication and JWT Validation", () => {
  const handler = withAuth(async (_req, { actor }) => Response.json({ userId: actor.userId }));

  it("rejects a request with no Authorization header (401)", async () => {
    const response = await handler(requestWithToken());
    expect(response.status).toBe(401);
    expect(await jsonOf(response)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("rejects a malformed/garbage token (401)", async () => {
    const response = await handler(requestWithToken("not-a-real-token"));
    expect(response.status).toBe(401);
  });

  it("rejects an expired token (401)", async () => {
    const expiredService = new JwtTokenService({
      accessSecret: "a".repeat(32),
      accessTtl: "-10",
      refreshHashSecret: "b".repeat(32),
    });
    const expiredToken = expiredService.signAccessToken({ sub: "user-1", role: "STUDENT" });

    const response = await handler(requestWithToken(expiredToken));
    expect(response.status).toBe(401);
  });

  it("rejects a token signed with a different secret (401)", async () => {
    const otherService = new JwtTokenService({
      accessSecret: "a-totally-different-secret-value-here",
      accessTtl: "15m",
      refreshHashSecret: "b".repeat(32),
    });
    const foreignToken = otherService.signAccessToken({ sub: "user-1", role: "STUDENT" });

    const response = await handler(requestWithToken(foreignToken));
    expect(response.status).toBe(401);
  });

  it("allows a request with a valid token through to the handler", async () => {
    const token = tokenService.signAccessToken({ sub: "user-1", role: "STUDENT" });
    const response = await handler(requestWithToken(token));

    expect(response.status).toBe(200);
    expect(await jsonOf(response)).toEqual({ userId: "user-1" });
  });
});

describe("withAuth — Role Validation", () => {
  const secretaryOnlyHandler = withAuth(
    async () => Response.json({ ok: true }),
    { roles: ["SECRETARY"] },
  );

  it("allows the Secretary", async () => {
    const token = tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" });
    const response = await secretaryOnlyHandler(requestWithToken(token));
    expect(response.status).toBe(200);
  });

  it("denies a Recruiter attempting a Secretary-only action (403) — brief's named restriction", async () => {
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
    const response = await secretaryOnlyHandler(requestWithToken(token));
    expect(response.status).toBe(403);
    expect(await jsonOf(response)).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("denies a Student attempting a Secretary-only action (403)", async () => {
    const token = tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT" });
    const response = await secretaryOnlyHandler(requestWithToken(token));
    expect(response.status).toBe(403);
  });

  it("with no roles specified, allows any authenticated role", async () => {
    const anyRoleHandler = withAuth(async () => Response.json({ ok: true }));
    for (const role of ["SECRETARY", "COORDINATOR", "STUDENT", "RECRUITER"] as const) {
      const token = tokenService.signAccessToken({ sub: "x", role });
      const response = await anyRoleHandler(requestWithToken(token));
      expect(response.status).toBe(200);
    }
  });
});

describe("withAuth — Batch Scope Validation", () => {
  const batchScopedHandler = withAuth(
    async () => Response.json({ ok: true }),
    {
      roles: ["SECRETARY", "COORDINATOR"],
      getRequiredBatchId: () => "batch-a",
    },
  );

  it("denies a Coordinator scoped to a DIFFERENT batch (403) — brief's named restriction", async () => {
    const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: ["batch-b"] });
    const response = await batchScopedHandler(requestWithToken(token));
    expect(response.status).toBe(403);
    expect(await jsonOf(response)).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("allows a Coordinator scoped to the matching batch", async () => {
    const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] });
    const response = await batchScopedHandler(requestWithToken(token));
    expect(response.status).toBe(200);
  });

  it("denies a Coordinator with an empty batch scope", async () => {
    const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: [] });
    const response = await batchScopedHandler(requestWithToken(token));
    expect(response.status).toBe(403);
  });

  it("allows the Secretary regardless of batch scope (unscoped by design)", async () => {
    const token = tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" });
    const response = await batchScopedHandler(requestWithToken(token));
    expect(response.status).toBe(200);
  });
});

describe("withAuth — Recruiter access restrictions", () => {
  it("denies a Recruiter on a route restricted to Secretary/Coordinator, even with a batch scope function present", async () => {
    const handler = withAuth(
      async () => Response.json({ ok: true }),
      { roles: ["SECRETARY", "COORDINATOR"], getRequiredBatchId: () => "batch-a" },
    );
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
    const response = await handler(requestWithToken(token));
    expect(response.status).toBe(403);
  });

  it("a route open to any authenticated role still lets a Recruiter through when no role restriction applies", async () => {
    const openHandler = withAuth(async () => Response.json({ ok: true }));
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
    const response = await openHandler(requestWithToken(token));
    expect(response.status).toBe(200);
  });
});

describe("withAuth — rate limiting (V4.0 A2)", () => {
  it("denies with 429 once the limiter's capacity is exhausted, without invoking the wrapped handler", async () => {
    let handlerCalls = 0;
    const limiter = new InMemoryRateLimiter({ capacity: 2, refillRatePerSecond: 0.001 });
    const handler = withAuth(
      async () => {
        handlerCalls++;
        return Response.json({ ok: true });
      },
      { rateLimit: { limiter, key: (actor) => `test:${actor.userId}` } },
    );
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });

    expect((await handler(requestWithToken(token))).status).toBe(200);
    expect((await handler(requestWithToken(token))).status).toBe(200);
    const blocked = await handler(requestWithToken(token));
    expect(blocked.status).toBe(429);
    expect(await jsonOf(blocked)).toMatchObject({ error: { code: "RATE_LIMITED" } });
    expect(handlerCalls).toBe(2);
  });

  it("keys are isolated per actor — one user's exhausted limit never blocks another", async () => {
    const limiter = new InMemoryRateLimiter({ capacity: 1, refillRatePerSecond: 0.001 });
    const handler = withAuth(async () => Response.json({ ok: true }), {
      rateLimit: { limiter, key: (actor) => `test:${actor.userId}` },
    });
    const tokenA = tokenService.signAccessToken({ sub: "rec-a", role: "RECRUITER" });
    const tokenB = tokenService.signAccessToken({ sub: "rec-b", role: "RECRUITER" });

    expect((await handler(requestWithToken(tokenA))).status).toBe(200);
    expect((await handler(requestWithToken(tokenA))).status).toBe(429);
    expect((await handler(requestWithToken(tokenB))).status).toBe(200);
  });

  it("runs after role validation — a role-denied request never touches the limiter", async () => {
    let consumeCalls = 0;
    const limiter: import("../../../src/lib/rate-limit").RateLimiter = {
      async consume() {
        consumeCalls++;
        return { allowed: true };
      },
    };
    const handler = withAuth(async () => Response.json({ ok: true }), {
      roles: ["SECRETARY"],
      rateLimit: { limiter, key: (actor) => actor.userId },
    });
    const token = tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT" });

    const response = await handler(requestWithToken(token));
    expect(response.status).toBe(403);
    expect(consumeCalls).toBe(0);
  });
});

describe("withAuth — middleware never runs business logic itself", () => {
  it("the wrapped handler is not invoked when authentication fails", async () => {
    let handlerCalled = false;
    const handler = withAuth(async () => {
      handlerCalled = true;
      return Response.json({ ok: true });
    });

    await handler(requestWithToken());
    expect(handlerCalled).toBe(false);
  });

  it("the wrapped handler is not invoked when role validation fails", async () => {
    let handlerCalled = false;
    const handler = withAuth(
      async () => {
        handlerCalled = true;
        return Response.json({ ok: true });
      },
      { roles: ["SECRETARY"] },
    );
    const token = tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT" });

    await handler(requestWithToken(token));
    expect(handlerCalled).toBe(false);
  });
});
