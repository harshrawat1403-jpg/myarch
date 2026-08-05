import { beforeEach, describe, expect, it } from "vitest";
import { LogoutUseCase } from "../../../src/modules/auth/application/use-cases/logout";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

function buildUseCase() {
  const tokenService = new JwtTokenService({
    accessSecret: "a".repeat(32),
    accessTtl: "15m",
    refreshHashSecret: "b".repeat(32),
  });
  const refreshTokenRepository = new InMemoryRefreshTokenRepository();
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new LogoutUseCase({ refreshTokenRepository, tokenService, auditRecorder });
  return { useCase, tokenService, refreshTokenRepository, auditRecorder };
}

describe("LogoutUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;
  let rawToken: string;

  beforeEach(async () => {
    ctx = buildUseCase();
    rawToken = ctx.tokenService.generateRefreshToken();
    await ctx.refreshTokenRepository.create({
      userId: "user-1",
      tokenHash: ctx.tokenService.hashRefreshToken(rawToken),
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
  });

  it("revokes the refresh token so it can no longer be used", async () => {
    await ctx.useCase.execute({ refreshToken: rawToken });

    const [stored] = ctx.refreshTokenRepository.all();
    expect(stored!.revokedAt).not.toBeNull();
  });

  it("records a LOGOUT audit entry", async () => {
    await ctx.useCase.execute({ refreshToken: rawToken });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "user-1", action: "LOGOUT" }),
    );
  });

  it("is idempotent — calling logout twice does not throw", async () => {
    await ctx.useCase.execute({ refreshToken: rawToken });
    await expect(ctx.useCase.execute({ refreshToken: rawToken })).resolves.not.toThrow();
  });

  it("does not throw when no refresh token is presented", async () => {
    await expect(ctx.useCase.execute({ refreshToken: undefined })).resolves.not.toThrow();
  });

  it("does not throw for an unknown/already-invalid token", async () => {
    await expect(ctx.useCase.execute({ refreshToken: "some-token-never-issued" })).resolves.not.toThrow();
  });

  it("revokes every token in the family, not just the most recent one", async () => {
    // Simulate a prior rotation: an older, already-revoked token in the same family.
    await ctx.refreshTokenRepository.create({
      userId: "user-1",
      tokenHash: ctx.tokenService.hashRefreshToken("an-older-rotated-token"),
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await ctx.useCase.execute({ refreshToken: rawToken });

    const stillActive = ctx.refreshTokenRepository.all().filter((t) => t.familyId === "family-1" && !t.revokedAt);
    expect(stillActive).toHaveLength(0);
  });
});
