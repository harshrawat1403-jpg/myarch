/**
 * Authorization test for every export route, all of which wrap their
 * handler with `withAuth({ roles: [...] })`. Same pattern as every prior
 * phase's route-authorization tests (auth, dashboard/audit, recruiters): a
 * fresh createAuthMiddleware bound to a test JwtTokenService, mirroring
 * each real route's exact role gate, rather than the real Prisma-backed
 * composition root — no live database is available in this environment.
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

const studentDirectoryHandler = withAuth(async () => Response.json({ ok: true }), {
  roles: ["SECRETARY", "COORDINATOR"],
});
const batchReportHandler = withAuth(async () => Response.json({ ok: true }), {
  roles: ["SECRETARY", "COORDINATOR"],
});
const publicPlacementHandler = withAuth(async () => Response.json({ ok: true }), {
  roles: ["SECRETARY", "COORDINATOR"],
});
const recruiterDirectoryHandler = withAuth(async () => Response.json({ ok: true }), {
  roles: ["SECRETARY"],
});

function requestWithToken(path: string, token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest(`http://localhost${path}`, { headers });
}

const BATCH_SCOPED_ROUTES = [
  { name: "GET /api/exports/students", handler: studentDirectoryHandler, path: "/api/exports/students" },
  { name: "GET /api/exports/batches", handler: batchReportHandler, path: "/api/exports/batches" },
  { name: "GET /api/exports/public-profiles", handler: publicPlacementHandler, path: "/api/exports/public-profiles" },
];

describe("Batch-scoped export routes (Student Directory, Batch Report, Public Placement Dataset)", () => {
  for (const route of BATCH_SCOPED_ROUTES) {
    describe(route.name, () => {
      it("allows the Secretary", async () => {
        const token = tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" });
        const response = await route.handler(requestWithToken(route.path, token));
        expect(response.status).toBe(200);
      });

      it("allows a Coordinator", async () => {
        const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] });
        const response = await route.handler(requestWithToken(route.path, token));
        expect(response.status).toBe(200);
      });

      it("denies a Recruiter (403) — 'Recruiters must never have access to administrative exports'", async () => {
        const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
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
    });
  }
});

describe("GET /api/exports/recruiters — Secretary-only", () => {
  it("allows the Secretary", async () => {
    const token = tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" });
    const response = await recruiterDirectoryHandler(requestWithToken("/api/exports/recruiters", token));
    expect(response.status).toBe(200);
  });

  it("denies a Coordinator — this export has no batch dimension to scope by", async () => {
    const token = tokenService.signAccessToken({ sub: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] });
    const response = await recruiterDirectoryHandler(requestWithToken("/api/exports/recruiters", token));
    expect(response.status).toBe(403);
  });

  it("denies a Recruiter (403)", async () => {
    const token = tokenService.signAccessToken({ sub: "rec-1", role: "RECRUITER" });
    const response = await recruiterDirectoryHandler(requestWithToken("/api/exports/recruiters", token));
    expect(response.status).toBe(403);
  });

  it("denies a Student (403)", async () => {
    const token = tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT", studentProfileId: "s1" });
    const response = await recruiterDirectoryHandler(requestWithToken("/api/exports/recruiters", token));
    expect(response.status).toBe(403);
  });

  it("denies an unauthenticated request (401)", async () => {
    const response = await recruiterDirectoryHandler(requestWithToken("/api/exports/recruiters"));
    expect(response.status).toBe(401);
  });
});
