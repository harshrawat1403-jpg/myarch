import { describe, expect, it } from "vitest";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";

const config = {
  accessSecret: "test-access-secret-at-least-32-chars-long",
  accessTtl: "15m",
  refreshHashSecret: "test-refresh-hash-secret-also-32-chars",
};

describe("JwtTokenService — access tokens", () => {
  it("signs and verifies a token round-trip, preserving claims", () => {
    const service = new JwtTokenService(config);
    const token = service.signAccessToken({
      sub: "user-1",
      role: "COORDINATOR",
      batchScope: ["batch-a", "batch-b"],
    });

    const claims = service.verifyAccessToken(token);
    expect(claims.sub).toBe("user-1");
    expect(claims.role).toBe("COORDINATOR");
    expect(claims.batchScope).toEqual(["batch-a", "batch-b"]);
  });

  it("rejects a token signed with a different secret", () => {
    const service = new JwtTokenService(config);
    const otherService = new JwtTokenService({ ...config, accessSecret: "a-completely-different-secret-value" });
    const token = otherService.signAccessToken({ sub: "user-1", role: "STUDENT" });

    expect(() => service.verifyAccessToken(token)).toThrow();
  });

  it("rejects a tampered token", () => {
    const service = new JwtTokenService(config);
    const token = service.signAccessToken({ sub: "user-1", role: "STUDENT" });
    const tampered = token.slice(0, -2) + (token.endsWith("A") ? "B" : "A") + token.slice(-1);

    expect(() => service.verifyAccessToken(tampered)).toThrow();
  });

  it("rejects an expired token", () => {
    const service = new JwtTokenService({ ...config, accessTtl: "-10s" });
    const token = service.signAccessToken({ sub: "user-1", role: "STUDENT" });

    expect(() => service.verifyAccessToken(token)).toThrow(/expired/i);
  });

  it("rejects a malformed string as a token", () => {
    const service = new JwtTokenService(config);
    expect(() => service.verifyAccessToken("not-a-jwt")).toThrow();
  });
});

describe("JwtTokenService — refresh token generation and hashing", () => {
  it("generates high-entropy, unique refresh tokens", () => {
    const service = new JwtTokenService(config);
    const tokenA = service.generateRefreshToken();
    const tokenB = service.generateRefreshToken();

    expect(tokenA).not.toBe(tokenB);
    expect(tokenA.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes deterministically — the same input always hashes the same way (required for lookup by hash)", () => {
    const service = new JwtTokenService(config);
    const raw = service.generateRefreshToken();

    expect(service.hashRefreshToken(raw)).toBe(service.hashRefreshToken(raw));
  });

  it("never stores/returns the raw token as its own hash", () => {
    const service = new JwtTokenService(config);
    const raw = service.generateRefreshToken();

    expect(service.hashRefreshToken(raw)).not.toBe(raw);
  });

  it("produces different hashes under different hash secrets (keyed hash, not a bare digest)", () => {
    const serviceA = new JwtTokenService(config);
    const serviceB = new JwtTokenService({ ...config, refreshHashSecret: "a-totally-different-hash-secret-value" });
    const raw = "some-fixed-raw-token-value";

    expect(serviceA.hashRefreshToken(raw)).not.toBe(serviceB.hashRefreshToken(raw));
  });
});
