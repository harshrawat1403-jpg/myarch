import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/modules/auth/presentation/with-auth";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";

const tokenService = new JwtTokenService({ accessSecret: "a".repeat(32), accessTtl: "15m", refreshHashSecret: "b".repeat(32) });
const protectedFormsHandler = createAuthMiddleware(tokenService)(async (_req, { actor }) => actor.role === "SECRETARY" ? Response.json({ data: [] }) : Response.json({ error: { code: "FORBIDDEN", message: "Only Secretary" } }, { status: 403 }));

function request(token?: string): NextRequest {
  return new NextRequest("http://localhost/api/forms", token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
}

describe("generic forms authorization boundary", () => {
  it("allows authenticated requests to reach the Secretary-only business rule", async () => {
    const response = await protectedFormsHandler(request(tokenService.signAccessToken({ sub: "sec-1", role: "SECRETARY" })));
    expect(response.status).toBe(200);
  });

  it("keeps students out of form administration", async () => {
    const response = await protectedFormsHandler(request(tokenService.signAccessToken({ sub: "stu-1", role: "STUDENT" })));
    expect(response.status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await protectedFormsHandler(request());
    expect(response.status).toBe(401);
  });
});
