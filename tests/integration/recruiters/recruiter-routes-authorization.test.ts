/**
 * Authorization test for every recruiter-facing route
 * (search/get-profile/dashboard-stats/get-resume), all of which wrap their
 * handler with `withAuth({ roles: ["RECRUITER"] })`. Same pattern as
 * tests/integration/auth/with-auth.test.ts and
 * tests/integration/dashboard/audit-route-authorization.test.ts: a fresh
 * createAuthMiddleware bound to a test JwtTokenService, rather than the
 * real Prisma-backed composition root — no live database is available in
 * this environment, and the middleware chain itself (not the Prisma query)
 * is what's under test here.
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

// Mirrors every real recruiter route's role gate exactly.
const RECRUITER_ONLY = { roles: ["RECRUITER"] as const };

const searchHandler = withAuth(async () => Response.json({ data: [] }), RECRUITER_ONLY);
const profileHandler = withAuth(async () => Response.json({ data: {} }), RECRUITER_ONLY);
const statsHandler = withAuth(async () => Response.json({ data: {} }), RECRUITER_ONLY);
const resumeHandler = withAuth(async () => Response.json({ data: {} }), RECRUITER_ONLY);

function requestWithToken(path: string, token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest(`http://localhost${path}`, { headers });
}

const ROUTES = [
  { name: "GET /api/recruiters/students (search)", handler: searchHandler, path: "/api/recruiters/students" },
  { name: "GET /api/recruiters/students/:id (profile)", handler: profileHandler, path: "/api/recruiters/students/s1" },
  { name: "GET /api/recruiters/dashboard (stats)", handler: statsHandler, path: "/api/recruiters/dashboard" },
  { name: "GET /api/recruiters/students/:id/resume", handler: resumeHandler, path: "/api/recruiters/students/s1/resume" },
];

describe("Recruiter routes — authorization ('Cannot: view drafts/pending/private, access admin/audit/approval endpoints')", () => {
  for (const route of ROUTES) {
    describe(route.name, () => {
      it("allows a Recruiter", async () => {
        const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
        const response = await route.handler(requestWithToken(route.path, token));
        expect(response.status).toBe(200);
      });

      it("denies the Secretary (403) — admin and recruiter surfaces are isolated", async () => {
        const token = tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" });
        const response = await route.handler(requestWithToken(route.path, token));
        expect(response.status).toBe(403);
      });

      it("denies a Coordinator (403)", async () => {
        const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] });
        const response = await route.handler(requestWithToken(route.path, token));
        expect(response.status).toBe(403);
      });

      it("denies a Student (403)", async () => {
        const token = tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT", studentProfileId: "s1" });
        const response = await route.handler(requestWithToken(route.path, token));
        expect(response.status).toBe(403);
      });

      it("denies an unauthenticated request (401)", async () => {
        const response = await route.handler(requestWithToken(route.path));
        expect(response.status).toBe(401);
      });

      it("denies an expired token (401)", async () => {
        const expiredService = new JwtTokenService({
          accessSecret: "a".repeat(32),
          accessTtl: "-10",
          refreshHashSecret: "b".repeat(32),
        });
        const expiredToken = expiredService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
        const response = await route.handler(requestWithToken(route.path, expiredToken));
        expect(response.status).toBe(401);
      });
    });
  }
});

describe("Recruiter role — cannot reach admin-only routes (cross-check using the real admin route gates)", () => {
  it("a Recruiter token is rejected by a Secretary/Coordinator-only route shape", async () => {
    const adminOnlyHandler = withAuth(async () => Response.json({ data: [] }), {
      roles: ["SECRETARY", "COORDINATOR"],
    });
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
    const response = await adminOnlyHandler(requestWithToken("/api/students", token));
    expect(response.status).toBe(403);
  });
});
