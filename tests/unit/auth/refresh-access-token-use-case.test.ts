import { beforeEach, describe, expect, it } from "vitest";
import { RefreshAccessTokenUseCase } from "../../../src/modules/auth/application/use-cases/refresh-access-token";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import {
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
  RefreshTokenReusedError,
} from "../../../src/modules/auth/domain/errors";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { ManualClock } from "../../support/fakes/manual-clock";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function buildUseCase() {
  const tokenService = new JwtTokenService({
    accessSecret: "a".repeat(32),
    accessTtl: "15m",
    refreshHashSecret: "b".repeat(32),
  });
  const userRepository = new InMemoryUserRepository();
  const refreshTokenRepository = new InMemoryRefreshTokenRepository();
  const auditRecorder = new FakeAuditRecorder();
  const clock = new ManualClock(new Date("2026-01-01T00:00:00.000Z"));

  const useCase = new RefreshAccessTokenUseCase({
    userRepository,
    refreshTokenRepository,
    tokenService,
    auditRecorder,
    clock,
    refreshTokenTtlMs: REFRESH_TTL_MS,
  });

  return { useCase, tokenService, userRepository, refreshTokenRepository, auditRecorder, clock };
}

describe("RefreshAccessTokenUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;
  let rawToken: string;
  let familyId: string;

  beforeEach(async () => {
    ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "user-1",
      email: "student@example.edu",
      passwordHash: "irrelevant-for-this-suite",
      role: "STUDENT",
      isActive: true,
    }, { studentProfileId: "student-profile-1" });

    rawToken = ctx.tokenService.generateRefreshToken();
    familyId = "family-1";
    await ctx.refreshTokenRepository.create({
      userId: "user-1",
      tokenHash: ctx.tokenService.hashRefreshToken(rawToken),
      familyId,
      expiresAt: new Date(ctx.clock.now().getTime() + REFRESH_TTL_MS),
    });
  });

  it("issues a new access token and rotates the refresh token", async () => {
    const result = await ctx.useCase.execute({ refreshToken: rawToken });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(rawToken);
    expect(result.actor).toEqual({ userId: "user-1", role: "STUDENT", studentProfileId: "student-profile-1" });
  });

  it("revokes the presented (old) token and links it to its replacement", async () => {
    const result = await ctx.useCase.execute({ refreshToken: rawToken });

    const oldTokenHash = ctx.tokenService.hashRefreshToken(rawToken);
    const oldStored = ctx.refreshTokenRepository.all().find((t) => t.tokenHash === oldTokenHash)!;
    const newTokenHash = ctx.tokenService.hashRefreshToken(result.refreshToken);
    const newStored = ctx.refreshTokenRepository.all().find((t) => t.tokenHash === newTokenHash)!;

    expect(oldStored.revokedAt).not.toBeNull();
    expect(oldStored.replacedById).toBe(newStored.id);
  });

  it("keeps the new token in the same family as the old one", async () => {
    const result = await ctx.useCase.execute({ refreshToken: rawToken });
    const newTokenHash = ctx.tokenService.hashRefreshToken(result.refreshToken);
    const newStored = ctx.refreshTokenRepository.all().find((t) => t.tokenHash === newTokenHash)!;

    expect(newStored.familyId).toBe(familyId);
  });

  it("rejects an unknown refresh token", async () => {
    await expect(ctx.useCase.execute({ refreshToken: "never-issued-token" })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it("rejects an expired refresh token", async () => {
    ctx.clock.advanceMs(REFRESH_TTL_MS + 1000);
    await expect(ctx.useCase.execute({ refreshToken: rawToken })).rejects.toBeInstanceOf(
      RefreshTokenExpiredError,
    );
  });

  it("rejects a token belonging to a now-deactivated user", async () => {
    ctx.userRepository.seed({
      id: "user-1",
      email: "student@example.edu",
      passwordHash: "irrelevant-for-this-suite",
      role: "STUDENT",
      isActive: false,
    });
    await expect(ctx.useCase.execute({ refreshToken: rawToken })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  describe("reuse detection", () => {
    it("rejects reuse of an already-rotated-out token and revokes the whole family", async () => {
      const first = await ctx.useCase.execute({ refreshToken: rawToken });

      // Attacker (or a buggy client) replays the OLD token after rotation.
      await expect(ctx.useCase.execute({ refreshToken: rawToken })).rejects.toBeInstanceOf(
        RefreshTokenReusedError,
      );

      // The legitimate NEW token must also be dead now — the whole family was revoked.
      await expect(ctx.useCase.execute({ refreshToken: first.refreshToken })).rejects.toBeInstanceOf(
        RefreshTokenReusedError,
      );
    });

    it("records a REFRESH_TOKEN_REUSE_DETECTED audit entry on reuse", async () => {
      await ctx.useCase.execute({ refreshToken: rawToken });
      await expect(ctx.useCase.execute({ refreshToken: rawToken })).rejects.toThrow();

      expect(ctx.auditRecorder.entries).toContainEqual(
        expect.objectContaining({ actorUserId: "user-1", action: "REFRESH_TOKEN_REUSE_DETECTED" }),
      );
    });
  });
});
