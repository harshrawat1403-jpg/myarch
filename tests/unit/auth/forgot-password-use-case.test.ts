import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordUseCase } from "../../../src/modules/auth/application/use-cases/forgot-password";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryPasswordResetTokenRepository } from "../../support/fakes/in-memory-password-reset-token-repository";
import { hashOpaqueToken } from "../../../src/lib/opaque-token";

const TEST_HASH_SECRET = "b".repeat(32);

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const passwordResetTokenRepository = new InMemoryPasswordResetTokenRepository();
  const sendEmail = vi.fn().mockResolvedValue(undefined);
  const useCase = new ForgotPasswordUseCase({
    userRepository,
    passwordResetTokenRepository,
    sendEmail,
    appBaseUrl: "https://myarch.example.edu",
    hashSecret: TEST_HASH_SECRET,
  });
  return { useCase, userRepository, passwordResetTokenRepository, sendEmail };
}

describe("ForgotPasswordUseCase", () => {
  it("does nothing for an email with no account (anti-enumeration)", async () => {
    const ctx = buildUseCase();
    await ctx.useCase.execute({ email: "nobody@x.com" });
    expect(ctx.sendEmail).not.toHaveBeenCalled();
    expect(ctx.passwordResetTokenRepository.all()).toHaveLength(0);
  });

  it("does nothing for a disabled account (would let its holder straight back in)", async () => {
    const ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "user-1",
      email: "a@x.com",
      passwordHash: "irrelevant",
      role: "STUDENT",
      isActive: false,
      mustChangePassword: false,
      avatarFileId: null,
    });
    await ctx.useCase.execute({ email: "a@x.com" });
    expect(ctx.sendEmail).not.toHaveBeenCalled();
  });

  it("issues a token and sends the reset email for a real, active account", async () => {
    const ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "user-1",
      email: "a@x.com",
      passwordHash: "irrelevant",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });

    await ctx.useCase.execute({ email: "a@x.com" });

    expect(ctx.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.com" }));
    const [stored] = ctx.passwordResetTokenRepository.all();
    expect(stored!.userId).toBe("user-1");

    const [message] = ctx.sendEmail.mock.calls[0]!;
    const url = new URL(message.text.match(/https?:\/\/\S+/)![0]);
    const rawToken = url.searchParams.get("token")!;
    expect(stored!.tokenHash).toBe(hashOpaqueToken(rawToken, TEST_HASH_SECRET));
  });

  it("normalizes email case/whitespace", async () => {
    const ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "user-1",
      email: "a@x.com",
      passwordHash: "irrelevant",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
    await ctx.useCase.execute({ email: "  A@X.com  " });
    expect(ctx.sendEmail).toHaveBeenCalled();
  });

  it("sets an expiry of roughly 1 hour", async () => {
    const ctx = buildUseCase();
    ctx.userRepository.seed({
      id: "user-1",
      email: "a@x.com",
      passwordHash: "irrelevant",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      avatarFileId: null,
    });
    const before = Date.now();
    await ctx.useCase.execute({ email: "a@x.com" });
    const [stored] = ctx.passwordResetTokenRepository.all();
    const ttlMs = stored!.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThan(59 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
  });
});
