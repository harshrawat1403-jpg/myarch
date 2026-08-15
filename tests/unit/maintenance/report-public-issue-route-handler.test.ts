import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockExecute, mockConsume } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockConsume: vi.fn(),
}));

vi.mock("../../../src/modules/maintenance/infrastructure/container", () => ({
  reportPublicMaintenanceIssueUseCase: { execute: mockExecute },
}));

vi.mock("@/lib/rate-limiters", () => ({
  publicMaintenanceReportRateLimiter: { consume: mockConsume },
}));

import { reportPublicMaintenanceIssueRouteHandler } from "../../../src/modules/maintenance/presentation/route-handlers/report-public";

function buildRequest(body: unknown, ip = "203.0.113.5") {
  return new NextRequest("http://localhost/api/maintenance/issues/public", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  name: "Jane Visitor",
  email: "jane@example.com",
  category: "ELECTRICAL",
  location: "Main Gate",
  description: "Flickering streetlight",
};

describe("reportPublicMaintenanceIssueRouteHandler", () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockConsume.mockReset();
    mockConsume.mockResolvedValue({ allowed: true });
  });

  it("returns 201 with only the reference id — no internal fields — on success", async () => {
    mockExecute.mockResolvedValueOnce({
      id: "issue-123",
      status: "SUBMITTED",
      requesterId: null,
      publicReporterName: "Jane Visitor",
      publicReporterEmail: "jane@example.com",
      assigneeId: null,
    });

    const res = await reportPublicMaintenanceIssueRouteHandler(buildRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toEqual({ id: "issue-123" });
    expect(body.data.publicReporterEmail).toBeUndefined();
    expect(body.data.status).toBeUndefined();
  });

  it("rejects a request missing required fields with 400", async () => {
    const res = await reportPublicMaintenanceIssueRouteHandler(buildRequest({ category: "ELECTRICAL" }));
    expect(res.status).toBe(400);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with 400", async () => {
    const res = await reportPublicMaintenanceIssueRouteHandler(buildRequest({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("enforces the per-IP rate limit before touching the use case", async () => {
    mockConsume.mockResolvedValueOnce({ allowed: false, retryAfterMs: 60000 });

    const res = await reportPublicMaintenanceIssueRouteHandler(buildRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockConsume).toHaveBeenCalledWith("maintenance-report:ip:203.0.113.5");
  });

  it("requires no authentication — no Authorization header needed to reach the use case", async () => {
    mockExecute.mockResolvedValueOnce({ id: "issue-456" });
    const req = buildRequest(VALID_BODY);
    expect(req.headers.get("authorization")).toBeNull();

    const res = await reportPublicMaintenanceIssueRouteHandler(req);
    expect(res.status).toBe(201);
  });
});
