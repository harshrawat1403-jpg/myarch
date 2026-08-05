/**
 * "Recruiter login" (Days 8–9 testing requirement). No new auth code was
 * written for this phase — Recruiter accounts use the exact same
 * LoginUseCase as every other role (Days 2–3). This test exists to
 * explicitly confirm that generalizes correctly for RECRUITER specifically,
 * rather than leaving it as an untested assumption: a successful login
 * issues a token whose claims carry role=RECRUITER (and no batchScope/
 * studentProfileId — a Recruiter has neither), and failure modes behave
 * identically to any other role.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { LoginUseCase } from "../../../src/modules/auth/application/use-cases/login";
import { InvalidCredentialsError } from "../../../src/modules/auth/domain/errors";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/bcrypt-password-hasher";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/jwt-token-service";
import { InMemoryUserRepository } from "../../support/fakes/in-memory-user-repository";
import { InMemoryRefreshTokenRepository } from "../../support/fakes/in-memory-refresh-token-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { ManualClock } from "../../support/fakes/manual-clock";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function buildContext() {
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

  return { useCase, passwordHasher, tokenService, userRepository };
}

describe("Recruiter login (reuses the existing, unmodified LoginUseCase)", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(async () => {
    ctx = buildContext();
    ctx.userRepository.seed({
      id: "recruiter-1",
      email: "hiring@studio-example.com",
      passwordHash: await ctx.passwordHasher.hash("correct-password"),
      role: "RECRUITER",
      isActive: true,
    });
  });

  it("succeeds for a Recruiter account and returns role=RECRUITER with no batch/student scope", async () => {
    const result = await ctx.useCase.execute({
      email: "hiring@studio-example.com",
      password: "correct-password",
    });

    expect(result.actor.role).toBe("RECRUITER");
    expect(result.actor.batchScope).toBeUndefined();
    expect(result.actor.studentProfileId).toBeUndefined();
  });

  it("issues an access token whose verified claims carry role=RECRUITER", async () => {
    const result = await ctx.useCase.execute({
      email: "hiring@studio-example.com",
      password: "correct-password",
    });

    const claims = ctx.tokenService.verifyAccessToken(result.accessToken);
    expect(claims.role).toBe("RECRUITER");
    expect(claims.sub).toBe("recruiter-1");
  });

  it("rejects an incorrect password the same way as any other role", async () => {
    await expect(
      ctx.useCase.execute({ email: "hiring@studio-example.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects a deactivated recruiter account", async () => {
    ctx.userRepository.seed({
      id: "recruiter-2",
      email: "inactive@studio-example.com",
      passwordHash: await ctx.passwordHasher.hash("correct-password"),
      role: "RECRUITER",
      isActive: false,
    });

    await expect(
      ctx.useCase.execute({ email: "inactive@studio-example.com", password: "correct-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
