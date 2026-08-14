import { beforeEach, describe, expect, it } from "vitest";
import { VerifyEmailUseCase } from "../../../src/modules/auth/application/use-cases/verify-email";
import { InvalidVerificationTokenError, VerificationTokenExpiredError } from "../../../src/modules/auth/domain/errors";
import { InMemoryEmailVerificationTokenRepository } from "../../support/fakes/in-memory-email-verification-token-repository";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { generateOpaqueToken, hashOpaqueToken } from "../../../src/lib/opaque-token";

const TEST_HASH_SECRET = "b".repeat(32);

function buildContext() {
  const emailVerificationTokenRepository = new InMemoryEmailVerificationTokenRepository();
  const userRepository = new InMemoryUserRepository();
  const useCase = new VerifyEmailUseCase({
    emailVerificationTokenRepository,
    userRepository,
    hashSecret: TEST_HASH_SECRET,
  });
  return { useCase, emailVerificationTokenRepository, userRepository };
}

describe("VerifyEmailUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
    ctx.userRepository.seed({
      id: "user-1",
      email: "a@x.com",
      passwordHash: "irrelevant",
      role: "RECRUITER",
      isActive: false,
      mustChangePassword: false,
      avatarFileId: null,
    });
  });

  it("throws InvalidVerificationTokenError for a token that was never issued", async () => {
    await expect(ctx.useCase.execute({ token: "never-issued" })).rejects.toBeInstanceOf(
      InvalidVerificationTokenError,
    );
  });

  it("marks the bound User's email verified and consumes the token (self-signup case)", async () => {
    const rawToken = generateOpaqueToken();
    await ctx.emailVerificationTokenRepository.create({
      email: "a@x.com",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await ctx.useCase.execute({ token: rawToken });

    expect(result.userId).toBe("user-1");
    expect(result.registrationRequestId).toBeNull();
    expect(ctx.userRepository.isEmailVerified("user-1")).toBe(true);
    expect(ctx.emailVerificationTokenRepository.all()[0]!.consumedAt).not.toBeNull();
  });

  it("does not touch User at all for the registration-request case (none exists yet)", async () => {
    const rawToken = generateOpaqueToken();
    await ctx.emailVerificationTokenRepository.create({
      email: "prospective@x.com",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      registrationRequestId: "req-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await ctx.useCase.execute({ token: rawToken });

    expect(result.registrationRequestId).toBe("req-1");
    expect(result.userId).toBeNull();
    // The caller (route handler) is responsible for the registration-side
    // update — see this use case's own doc comment.
  });

  it("rejects a token that has already been consumed", async () => {
    const rawToken = generateOpaqueToken();
    const stored = await ctx.emailVerificationTokenRepository.create({
      email: "a@x.com",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await ctx.emailVerificationTokenRepository.markConsumed(stored.id);

    await expect(ctx.useCase.execute({ token: rawToken })).rejects.toBeInstanceOf(
      VerificationTokenExpiredError,
    );
  });

  it("rejects an expired token", async () => {
    const rawToken = generateOpaqueToken();
    await ctx.emailVerificationTokenRepository.create({
      email: "a@x.com",
      tokenHash: hashOpaqueToken(rawToken, TEST_HASH_SECRET),
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(ctx.useCase.execute({ token: rawToken })).rejects.toBeInstanceOf(
      VerificationTokenExpiredError,
    );
  });
});
