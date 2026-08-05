import { beforeEach, describe, expect, it } from "vitest";
import { LoginUseCase } from "../../../src/modules/auth/application/use-cases/login";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import { InvalidCredentialsError } from "../../../src/modules/auth/domain/errors";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { ManualClock } from "../../support/fakes/manual-clock";

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
  const clock = new ManualClock(new Date("2026-01-01T00:00:00.000Z"));

  const useCase = new LoginUseCase({
    userRepository,
    refreshTokenRepository,
    passwordHasher,
    tokenService,
    auditRecorder,
    clock,
    refreshTokenTtlMs: REFRESH_TTL_MS,
  });

  return { useCase, passwordHasher, tokenService, userRepository, refreshTokenRepository, auditRecorder, clock };
}

describe("LoginUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(async () => {
    ctx = buildUseCase();
    ctx.userRepository.seed(
      {
        id: "user-1",
        email: "student@example.edu",
        passwordHash: await ctx.passwordHasher.hash("correct-password"),
        role: "STUDENT",
        isActive: true,
      },
      { studentProfileId: "student-profile-1" },
    );
  });

  it("succeeds with valid credentials and returns an access + refresh token", async () => {
    const result = await ctx.useCase.execute({ email: "student@example.edu", password: "correct-password" });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.actor).toEqual({ userId: "user-1", role: "STUDENT", studentProfileId: "student-profile-1" });

    const claims = ctx.tokenService.verifyAccessToken(result.accessToken);
    expect(claims.sub).toBe("user-1");
    expect(claims.studentProfileId).toBe("student-profile-1");
  });

  it("persists a refresh token record hashed, not in plaintext", async () => {
    const result = await ctx.useCase.execute({ email: "student@example.edu", password: "correct-password" });

    const stored = ctx.refreshTokenRepository.all();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.tokenHash).not.toBe(result.refreshToken);
    expect(stored[0]!.tokenHash).toBe(ctx.tokenService.hashRefreshToken(result.refreshToken));
  });

  it("is case-insensitive and trims whitespace on email", async () => {
    const result = await ctx.useCase.execute({ email: "  STUDENT@Example.EDU  ", password: "correct-password" });
    expect(result.actor.userId).toBe("user-1");
  });

  it("records a LOGIN_SUCCESS audit entry", async () => {
    await ctx.useCase.execute({ email: "student@example.edu", password: "correct-password" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "user-1", action: "LOGIN_SUCCESS" }),
    );
  });

  it("rejects an incorrect password with a generic InvalidCredentialsError", async () => {
    await expect(
      ctx.useCase.execute({ email: "student@example.edu", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("records a LOGIN_FAILED audit entry when the password is wrong but the account exists", async () => {
    await expect(ctx.useCase.execute({ email: "student@example.edu", password: "wrong-password" })).rejects.toThrow();
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "user-1", action: "LOGIN_FAILED" }),
    );
  });

  it("rejects an unknown email with the same generic error (no account-enumeration signal)", async () => {
    await expect(
      ctx.useCase.execute({ email: "nobody@example.edu", password: "anything" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects a deactivated account even with the correct password", async () => {
    ctx.userRepository.seed({
      id: "user-2",
      email: "inactive@example.edu",
      passwordHash: await ctx.passwordHasher.hash("correct-password"),
      role: "STUDENT",
      isActive: false,
    });

    await expect(
      ctx.useCase.execute({ email: "inactive@example.edu", password: "correct-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("does not create a refresh token record on failed login", async () => {
    await expect(ctx.useCase.execute({ email: "student@example.edu", password: "wrong" })).rejects.toThrow();
    expect(ctx.refreshTokenRepository.all()).toHaveLength(0);
  });

  it("embeds a Coordinator's batch scope in the access token claims", async () => {
    ctx.userRepository.seed(
      {
        id: "coord-1",
        email: "coordinator@example.edu",
        passwordHash: await ctx.passwordHasher.hash("coord-password"),
        role: "COORDINATOR",
        isActive: true,
      },
      { batchScope: ["batch-a", "batch-b"] },
    );

    const result = await ctx.useCase.execute({ email: "coordinator@example.edu", password: "coord-password" });
    expect(result.actor.batchScope).toEqual(["batch-a", "batch-b"]);

    const claims = ctx.tokenService.verifyAccessToken(result.accessToken);
    expect(claims.batchScope).toEqual(["batch-a", "batch-b"]);
  });
});
