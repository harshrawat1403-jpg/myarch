import { beforeEach, describe, expect, it } from "vitest";
import { ResetPasswordUseCase } from "../../../src/modules/auth/application/use-cases/reset-password";
import { InvalidPasswordResetTokenError, PasswordResetTokenExpiredError } from "../../../src/modules/auth/domain/errors";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryPasswordResetTokenRepository } from "../../support/fakes/in-memory-password-reset-token-repository";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { generateOpaqueToken, hashOpaqueToken } from "../../../src/lib/opaque-token";

const TEST_HASH_SECRET = "b".repeat(32);

function buildContext() {
  const userRepository = new InMemoryUserRepository();
  const passwordResetTokenRepository = new InMemoryPasswordResetTokenRepository();
  const refreshTokenRepository = new InMemoryRefreshTokenRepository();
  const passwordHasher = new BcryptPasswordHasher(12);
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new ResetPasswordUseCase({
    userRepository,
    passwordResetTokenRepository,
    refreshTokenRepository,
    passwordHasher,
    auditRecorder,
    hashSecret: TEST_HASH_SECRET,
  });
  return { useCase, userRepository, passwordResetTokenRepository, refreshTokenRepository, passwordHasher, auditRecorder };
}

describe("ResetPasswordUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
    ctx.userRepository.seed({
      id: "user-1",
      email: "a@x.com",
      passwordHash: "old-hash",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
  });

  it("throws InvalidPasswordResetTokenError for a token that was never issued", async () => {
    await expect(
      ctx.useCase.execute({ token: "never-issued", newPassword: "NewPass!2345" }),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it("sets the new password hash, consumes the token, and revokes every session", async () => {
    const rawToken = generateOpaqueToken();
    await ctx.passwordResetTokenRepository.create({
      userId: "user-1",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await ctx.refreshTokenRepository.create({
      userId: "user-1",
      tokenHash: "existing-session",
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 100_000),
    });

    await ctx.useCase.execute({ token: rawToken, newPassword: "NewPass!2345" });

    const user = await ctx.userRepository.findById("user-1");
    expect(await ctx.passwordHasher.compare("NewPass!2345", user!.passwordHash)).toBe(true);
    expect(ctx.passwordResetTokenRepository.all()[0]!.consumedAt).not.toBeNull();
    expect(ctx.refreshTokenRepository.all()[0]!.revokedAt).not.toBeNull();
  });

  it("records a PASSWORD_CHANGED audit entry attributed to the account, tagged as an email reset", async () => {
    const rawToken = generateOpaqueToken();
    await ctx.passwordResetTokenRepository.create({
      userId: "user-1",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await ctx.useCase.execute({ token: rawToken, newPassword: "NewPass!2345" });

    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        actorUserId: "user-1",
        action: "PASSWORD_CHANGED",
        metadata: { via: "email_reset" },
      }),
    );
  });

  it("rejects an already-consumed token", async () => {
    const rawToken = generateOpaqueToken();
    const stored = await ctx.passwordResetTokenRepository.create({
      userId: "user-1",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await ctx.passwordResetTokenRepository.markConsumed(stored.id);

    await expect(
      ctx.useCase.execute({ token: rawToken, newPassword: "NewPass!2345" }),
    ).rejects.toBeInstanceOf(PasswordResetTokenExpiredError);
  });

  it("rejects an expired token", async () => {
    const rawToken = generateOpaqueToken();
    await ctx.passwordResetTokenRepository.create({
      userId: "user-1",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      ctx.useCase.execute({ token: rawToken, newPassword: "NewPass!2345" }),
    ).rejects.toBeInstanceOf(PasswordResetTokenExpiredError);
  });
});
