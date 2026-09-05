import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import type { Role } from "../../../src/modules/auth/domain/entities";

const mocks = vi.hoisted(() => ({
  repository: {
    create: vi.fn(),
    get: vi.fn(),
    candidates: vi.fn(),
    transition: vi.fn(),
    activeStudentUserIds: vi.fn(),
  },
  applicationRepository: { findById: vi.fn() },
  notify: vi.fn(),
}));
vi.mock("@/modules/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/modules/auth")>();
  const { createAuthMiddleware } = await import("../../../src/modules/auth/presentation/with-auth");
  const { JwtTokenService } =
    await import("../../../src/modules/auth/infrastructure/jwt-token-service");
  return {
    ...actual,
    withAuth: createAuthMiddleware(
      new JwtTokenService({
        accessSecret: "a".repeat(32),
        accessTtl: "15m",
        refreshHashSecret: "b".repeat(32),
      }),
    ),
  };
});
vi.mock("../../../src/modules/elections/infrastructure/container", async () => {
  const { ElectionUseCases } =
    await import("../../../src/modules/elections/application/election-use-cases");
  return {
    electionUseCases: new ElectionUseCases(mocks.repository as never, { notify: mocks.notify }),
  };
});
vi.mock("../../../src/modules/applications/infrastructure/container", async () => {
  const { GetApplicationUseCase } =
    await import("../../../src/modules/applications/application/use-cases/get-application");
  const { GetMyApplicationUseCase } =
    await import("../../../src/modules/applications/application/use-cases/get-my-application");
  return {
    getApplicationUseCase: new GetApplicationUseCase({
      applicationRepository: mocks.applicationRepository as never,
    }),
    getMyApplicationUseCase: new GetMyApplicationUseCase({
      applicationRepository: mocks.applicationRepository as never,
    }),
  };
});
import { POST as create } from "../../../src/app/api/elections/route";
import { GET as candidates } from "../../../src/app/api/elections/[id]/candidates/route";
import { POST as transition } from "../../../src/app/api/elections/[id]/status/route";
import { getApplicationRouteHandler } from "../../../src/modules/applications/presentation/route-handlers/get";
const tokens = new JwtTokenService({
  accessSecret: "a".repeat(32),
  accessTtl: "15m",
  refreshHashSecret: "b".repeat(32),
});
const id = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };
function request(role?: Role, body?: unknown, userId = "actor") {
  return new NextRequest("http://localhost/api/elections", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(role
        ? {
            authorization: `Bearer ${tokens.signAccessToken({ sub: userId, role, permissions: ["applications.view", "applications.review"], batchScope: ["batch"] })}`,
          }
        : {}),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const config = {
  title: "Council",
  academicYear: "2026-2027",
  type: "COUNCIL",
  applicationOpenAt: "2026-09-01T00:00:00Z",
  applicationCloseAt: "2026-09-10T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.repository.create.mockResolvedValue({ id, ...config });
  mocks.repository.get.mockResolvedValue({ id, status: "APPLICATION_OPEN" });
  mocks.repository.candidates.mockResolvedValue([]);
});
describe("real Phase 6 routes and use cases", () => {
  it("creates through the Secretary route and rejects unauthenticated access", async () => {
    expect((await create(request("SECRETARY", config))).status).toBe(201);
    expect(mocks.repository.create).toHaveBeenCalledOnce();
    expect((await create(request(undefined, config))).status).toBe(401);
  });
  it.each(["COORDINATOR", "STUDENT", "RECRUITER", "ALUMNI"] as const)(
    "blocks %s on the real creation route",
    async (role) => {
      expect((await create(request(role, config))).status).toBe(403);
      expect(mocks.repository.create).not.toHaveBeenCalled();
    },
  );
  it("rejects later lifecycle transitions at the real route", async () => {
    expect((await transition(request("SECRETARY", { status: "VOTING" }), context)).status).toBe(
      400,
    );
    expect(mocks.repository.transition).not.toHaveBeenCalled();
  });
  it("scopes the student candidate route to the authenticated user", async () => {
    expect((await candidates(request("STUDENT", undefined, "student-a"), context)).status).toBe(
      200,
    );
    expect(mocks.repository.candidates).toHaveBeenCalledWith(id, "student-a");
    expect((await candidates(request("COORDINATOR"), context)).status).toBe(403);
  });
  it("protects the reused private application route against other students and scoped Coordinators", async () => {
    mocks.applicationRepository.findById.mockResolvedValue({
      id,
      electionId: id,
      applicantUserId: "student-a",
      answers: { private: "sensitive" },
      fields: [],
      statusEvents: [],
      reviewers: [{ reviewerUserId: "actor", unassignedAt: null }],
      applicantBatchId: "batch",
    });
    const own = await getApplicationRouteHandler(
      request("STUDENT", undefined, "student-a"),
      context,
    );
    expect(own.status).toBe(200);
    expect((await own.json()).data.answers.private).toBe("sensitive");
    for (const role of ["STUDENT", "COORDINATOR", "RECRUITER", "ALUMNI"] as const) {
      const response = await getApplicationRouteHandler(request(role), context);
      expect(response.status).toBe(403);
      expect(await response.text()).not.toContain("sensitive");
    }
    expect((await getApplicationRouteHandler(request("SECRETARY"), context)).status).toBe(200);
  });
});
