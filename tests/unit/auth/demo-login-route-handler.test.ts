/**
 * Regression coverage for the bug fixed in demo-login.ts: any failure other
 * than DemoAccountNotSeededError (a DB outage, a migration not yet applied,
 * a misconfigured env var, ...) must never escape the route handler
 * unformatted — the frontend's envelope parser has no `error.message` to
 * read from a raw thrown error and falls back to a generic, undiagnosable
 * "Request failed". Container and rate limiter are mocked so this stays a
 * fast, DB-free unit test of the handler's own error-mapping, not a retest
 * of DemoLoginUseCase's already-covered business logic.
 */
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoAccountNotSeededError } from "../../../src/modules/auth/domain/errors";

const executeMock = vi.fn();

vi.mock("../../../src/modules/auth/infrastructure/container", () => ({
  getDemoLoginUseCase: () => ({ execute: executeMock }),
}));

vi.mock("../../../src/lib/rate-limiters", () => ({
  demoLoginRateLimiter: { consume: vi.fn().mockResolvedValue({ allowed: true }) },
}));

import { demoLoginRouteHandler } from "../../../src/modules/auth/presentation/route-handlers/demo-login";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/demo-login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function jsonOf(response: Response): Promise<unknown> {
  return response.json();
}

describe("demoLoginRouteHandler", () => {
  afterEach(() => {
    executeMock.mockReset();
  });

  it("rejects an invalid persona (400), never reaching the use case", async () => {
    const response = await demoLoginRouteHandler(postRequest({ persona: "SUPERADMIN" }));
    expect(response.status).toBe(400);
    expect(await jsonOf(response)).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("maps DemoAccountNotSeededError to a clean 404, not a raw throw", async () => {
    executeMock.mockRejectedValueOnce(new DemoAccountNotSeededError());
    const response = await demoLoginRouteHandler(postRequest({ persona: "STUDENT" }));
    expect(response.status).toBe(404);
    expect(await jsonOf(response)).toMatchObject({
      error: { code: "NOT_FOUND", message: expect.stringContaining("not been seeded") },
    });
  });

  it("THE FIX: an unrelated infrastructure failure (DB unreachable, bad env, ...) returns a proper JSON 503 instead of an uncaught throw", async () => {
    executeMock.mockRejectedValueOnce(new Error("Can't reach database server at localhost:5432"));
    const response = await demoLoginRouteHandler(postRequest({ persona: "RECRUITER" }));

    expect(response.status).toBe(503);
    const body = await jsonOf(response);
    expect(body).toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } });
    // The real error must never reach the client — no DB host, no stack trace.
    expect(JSON.stringify(body)).not.toContain("localhost:5432");
  });

  it("a rate-limiter failure (e.g. its own DB table missing) is caught the same way, not left to crash uncaught", async () => {
    const { demoLoginRateLimiter } = await import("../../../src/lib/rate-limiters");
    vi.mocked(demoLoginRateLimiter.consume).mockRejectedValueOnce(
      new Error('relation "rate_limit_buckets" does not exist'),
    );
    const response = await demoLoginRouteHandler(postRequest({ persona: "ADMIN" }));
    expect(response.status).toBe(503);
    expect(await jsonOf(response)).toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } });
  });

  it("still returns a normal 200 + access token on success", async () => {
    executeMock.mockResolvedValueOnce({
      accessToken: "token-abc",
      refreshToken: "refresh-abc",
      refreshTokenExpiresAt: new Date("2026-02-01T00:00:00.000Z"),
      actor: { userId: "user-1", role: "STUDENT", isDemo: true },
    });
    const response = await demoLoginRouteHandler(postRequest({ persona: "STUDENT" }));
    expect(response.status).toBe(200);
    expect(await jsonOf(response)).toMatchObject({ data: { accessToken: "token-abc", role: "STUDENT" } });
    expect(response.headers.get("set-cookie")).toContain("tnparch_refresh_token=refresh-abc");
  });
});
