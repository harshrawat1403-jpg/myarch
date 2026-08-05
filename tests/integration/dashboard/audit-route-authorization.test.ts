/**
 * Authorization test for the Day 7 audit-history endpoint
 * (src/app/api/audit/recent/route.ts), which wraps its handler with
 * `withAuth({ roles: ["SECRETARY", "COORDINATOR"] })`. Mirrors
 * tests/integration/auth/with-auth.test.ts's pattern (a fresh
 * createAuthMiddleware bound to a test JwtTokenService) rather than
 * exercising the real Prisma-backed composition root, for the same reason
 * every prior phase has: no real database is available in this
 * environment, and the middleware chain itself is what's being verified
 * here, not the Prisma query.
 */
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/modules/auth/presentation/with-auth";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";

const tokenService = new JwtTokenService({
  accessSecret: "a".repeat(32),
  accessTtl: "15m",
  refreshHashSecret: "b".repeat(32),
});
const withAuth = createAuthMiddleware(tokenService);

// Mirrors the real route's role gate exactly.
const auditRecentHandler = withAuth(async () => Response.json({ data: [] }), {
  roles: ["SECRETARY", "COORDINATOR"],
});

function requestWithToken(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/audit/recent", { headers });
}

describe("GET /api/audit/recent — dashboard authorization", () => {
  it("allows the Secretary", async () => {
    const token = tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" });
    const response = await auditRecentHandler(requestWithToken(token));
    expect(response.status).toBe(200);
  });

  it("allows a Coordinator", async () => {
    const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] });
    const response = await auditRecentHandler(requestWithToken(token));
    expect(response.status).toBe(200);
  });

  it("denies a Student (403)", async () => {
    const token = tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT" });
    const response = await auditRecentHandler(requestWithToken(token));
    expect(response.status).toBe(403);
  });

  it("denies a Recruiter (403)", async () => {
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
    const response = await auditRecentHandler(requestWithToken(token));
    expect(response.status).toBe(403);
  });

  it("denies an unauthenticated request (401)", async () => {
    const response = await auditRecentHandler(requestWithToken());
    expect(response.status).toBe(401);
  });
});
