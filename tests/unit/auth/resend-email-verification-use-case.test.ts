import { describe, expect, it, vi } from "vitest";
import { ResendEmailVerificationUseCase } from "../../../src/modules/auth/application/use-cases/resend-email-verification";
import { InMemoryEmailVerificationTokenRepository } from "../../support/fakes/in-memory-email-verification-token-repository";
import { generateOpaqueToken, hashOpaqueToken } from "../../../src/lib/opaque-token";

const TEST_HASH_SECRET = "b".repeat(32);

function buildUseCase() {
  const emailVerificationTokenRepository = new InMemoryEmailVerificationTokenRepository();
  const sendEmail = vi.fn().mockResolvedValue(undefined);
  const useCase = new ResendEmailVerificationUseCase({
    emailVerificationTokenRepository,
    sendEmail,
    appBaseUrl: "https://myarch.example.edu",
    hashSecret: TEST_HASH_SECRET,
  });
  return { useCase, emailVerificationTokenRepository, sendEmail };
}

describe("ResendEmailVerificationUseCase", () => {
  it("does nothing for an email that never signed up (anti-enumeration)", async () => {
    const ctx = buildUseCase();
    await ctx.useCase.execute({ email: "nobody@x.com" });
    expect(ctx.sendEmail).not.toHaveBeenCalled();
  });

  it("does nothing for an email that's already verified (anti-enumeration)", async () => {
    const ctx = buildUseCase();
    const stored = await ctx.emailVerificationTokenRepository.create({
      email: "a@x.com",
      tokenHash: "hash-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await ctx.emailVerificationTokenRepository.markConsumed(stored.id);

    await ctx.useCase.execute({ email: "a@x.com" });
    expect(ctx.sendEmail).not.toHaveBeenCalled();
  });

  it("re-issues a fresh token bound to the same userId and resends", async () => {
    const ctx = buildUseCase();
    await ctx.emailVerificationTokenRepository.create({
      email: "a@x.com",
      tokenHash: hashOpaqueToken(generateOpaqueToken(), TEST_HASH_SECRET),
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await ctx.useCase.execute({ email: "a@x.com" });

    expect(ctx.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.com" }));
    const all = ctx.emailVerificationTokenRepository.all();
    expect(all).toHaveLength(2);
    expect(all[1]!.userId).toBe("user-1");
  });

  it("re-issues a fresh token bound to the same registrationRequestId and resends", async () => {
    const ctx = buildUseCase();
    await ctx.emailVerificationTokenRepository.create({
      email: "prospective@x.com",
      tokenHash: hashOpaqueToken(generateOpaqueToken(), TEST_HASH_SECRET),
      registrationRequestId: "req-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await ctx.useCase.execute({ email: "prospective@x.com" });

    const all = ctx.emailVerificationTokenRepository.all();
    expect(all[1]!.registrationRequestId).toBe("req-1");
  });

  it("normalizes email case/whitespace before looking it up", async () => {
    const ctx = buildUseCase();
    await ctx.emailVerificationTokenRepository.create({
      email: "a@x.com",
      tokenHash: hashOpaqueToken(generateOpaqueToken(), TEST_HASH_SECRET),
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await ctx.useCase.execute({ email: "  A@X.com  " });
    expect(ctx.sendEmail).toHaveBeenCalled();
  });
});
