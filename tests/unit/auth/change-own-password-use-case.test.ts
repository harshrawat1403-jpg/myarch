import { beforeEach, describe, expect, it } from "vitest";
import { ChangeOwnPasswordUseCase } from "../../../src/modules/auth/application/use-cases/change-own-password";
import { CurrentPasswordIncorrectError, NewPasswordSameAsCurrentError } from "../../../src/modules/auth/domain/errors";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function buildUseCase() {
  const passwordHasher = new BcryptPasswordHasher(12);
  const tokenService = new JwtTokenService({
    accessSecret: "a".repeat(32),
    accessTtl: "15m",
    refreshHashSecret: "b".repeat(32),
  });
  const userRepository = new InMemoryUserRepository();
  const refreshTokenRepository = new InMemoryRefreshTokenRepository();
  const auditRecorder = new FakeAuditRecorder();
  const clock = { now: () => new Date("2026-01-01T00:00:00.000Z") };

  const useCase = new ChangeOwnPasswordUseCase({
    userRepository,
    refreshTokenRepository,
    passwordHasher,
    auditRecorder,
    tokenService,
    clock,
    refreshTokenTtlMs: REFRESH_TTL_MS,
  });

  return { useCase, passwordHasher, tokenService, userRepository, refreshTokenRepository, auditRecorder };
}

const ACTOR: AuthenticatedActor = { userId: "user-1", role: "STUDENT", studentProfileId: "sp-1", mustChangePassword: true };

describe("ChangeOwnPasswordUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(async () => {
    ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "user-1",
      email: "student@example.edu",
      passwordHash: await ctx.passwordHasher.hash("temp-password-123!"),
      role: "STUDENT",
      isActive: true,
      mustChangePassword: true,
      avatarFileId: null,
    });
  });

  it("rejects an incorrect current password", async () => {
    await expect(
      ctx.useCase.execute({ actor: ACTOR, currentPassword: "wrong", newPassword: "NewPassword123!" }),
    ).rejects.toBeInstanceOf(CurrentPasswordIncorrectError);
  });

  it("rejects a new password identical to the current one", async () => {
    await expect(
      ctx.useCase.execute({
        actor: ACTOR,
        currentPassword: "temp-password-123!",
        newPassword: "temp-password-123!",
      }),
    ).rejects.toBeInstanceOf(NewPasswordSameAsCurrentError);
  });

  it("succeeds with the correct current password and clears mustChangePassword in the returned actor", async () => {
    const result = await ctx.useCase.execute({
      actor: ACTOR,
      currentPassword: "temp-password-123!",
      newPassword: "NewPassword123!",
    });

    expect(result.actor.mustChangePassword).toBeUndefined();
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("issues an access token whose claims no longer carry mustChangePassword", async () => {
    const result = await ctx.useCase.execute({
      actor: ACTOR,
      currentPassword: "temp-password-123!",
      newPassword: "NewPassword123!",
    });

    const claims = ctx.tokenService.verifyAccessToken(result.accessToken);
    expect(claims.mustChangePassword).toBeFalsy();
  });

  it("updates the stored password hash and clears mustChangePassword on the user record", async () => {
    await ctx.useCase.execute({
      actor: ACTOR,
      currentPassword: "temp-password-123!",
      newPassword: "NewPassword123!",
    });

    const updated = await ctx.userRepository.findById("user-1");
    expect(updated!.mustChangePassword).toBe(false);
    await expect(ctx.passwordHasher.compare("NewPassword123!", updated!.passwordHash)).resolves.toBe(true);
  });

  it("revokes every prior session before issuing the new one", async () => {
    await ctx.refreshTokenRepository.create({
      userId: "user-1",
      tokenHash: "old-session-hash",
      familyId: "old-family",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await ctx.useCase.execute({
      actor: ACTOR,
      currentPassword: "temp-password-123!",
      newPassword: "NewPassword123!",
    });

    const oldSession = ctx.refreshTokenRepository.all().find((t) => t.familyId === "old-family");
    expect(oldSession!.revokedAt).not.toBeNull();
  });

  it("records a PASSWORD_CHANGED audit entry", async () => {
    await ctx.useCase.execute({
      actor: ACTOR,
      currentPassword: "temp-password-123!",
      newPassword: "NewPassword123!",
    });

    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "user-1", action: "PASSWORD_CHANGED" }),
    );
  });
});
