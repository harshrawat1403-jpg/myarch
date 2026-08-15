import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Regression test for the bug found while diagnosing the Coordinator
 * creation atomicity fix: MaxActiveCoordinatorsError was thrown by
 * CreateCoordinatorUseCase but never caught in createCoordinatorRouteHandler's
 * catch chain, so hitting the max-2-active-Coordinators cap surfaced as a
 * raw, uncaught HTTP 500 instead of the same clean 4xx every other
 * Coordinator cap/validation error already returns (see
 * MaxActiveMaintenanceRoleError/InactiveCoordinatorError/
 * InvalidCustomPositionError in the same catch chain).
 *
 * Tested at the route-handler layer (not just the use case) because that is
 * exactly where the bug lived — a plain CreateCoordinatorUseCase unit test
 * already proves the *business rule* (max 2 active) fires correctly and
 * writes nothing (see create-coordinator-use-case.test.ts); it could never
 * have caught this defect, which was purely in the HTTP status/body mapping
 * one layer up. The real getCreateCoordinatorUseCase()/withAuth are
 * replaced with light mocks (vi.mock is hoisted above these imports by
 * Vitest) so this stays a fast, DB-free unit test while still exercising
 * the actual exported route handler and its real catch chain.
 */
const mockExecute = vi.fn();

vi.mock("../../../src/modules/coordinators/infrastructure/container", () => ({
  getCreateCoordinatorUseCase: () => ({ execute: mockExecute }),
}));

vi.mock("@/modules/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...actual,
    // Bypasses real JWT verification — hands the wrapped handler a fixed
    // SECRETARY actor directly, so this test exercises the route handler's
    // own try/catch mapping, not the auth middleware.
    withAuth:
      (handler: (req: NextRequest, auth: { actor: unknown }, routeContext?: unknown) => Promise<Response>) =>
      (req: NextRequest, routeContext?: unknown) =>
        handler(req, { actor: { userId: "sec-1", role: "SECRETARY" } }, routeContext),
  };
});

import { createCoordinatorRouteHandler } from "../../../src/modules/coordinators/presentation/route-handlers/create";
import { MaxActiveCoordinatorsError } from "../../../src/modules/coordinators/domain/errors";

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/coordinators", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createCoordinatorRouteHandler — MaxActiveCoordinatorsError mapping (regression)", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("returns a 400 VALIDATION_ERROR response, not a raw 500, when the active-Coordinator cap is reached", async () => {
    mockExecute.mockRejectedValueOnce(new MaxActiveCoordinatorsError());

    const res = await createCoordinatorRouteHandler(
      buildRequest({ email: "third@tnparch.in", fullName: "Third Coordinator" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("MYARCH allows a maximum of 2 active Coordinators at a time");
  });

  it("never invokes the use case's execute more than once, and the mapped response carries no partial-success payload", async () => {
    mockExecute.mockRejectedValueOnce(new MaxActiveCoordinatorsError());

    const res = await createCoordinatorRouteHandler(
      buildRequest({ email: "third@tnparch.in", fullName: "Third Coordinator" }),
    );

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.data).toBeUndefined();
  });
});
