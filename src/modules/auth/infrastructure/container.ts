/**
 * Composition root for the auth module: wires concrete infrastructure
 * implementations into the Application-layer use cases, and exposes the
 * ready-to-use singletons that route handlers (Presentation layer) consume.
 *
 * Nothing outside this file should construct BcryptPasswordHasher,
 * JwtTokenService, or the Prisma-backed repositories directly.
 *
 * Everything that depends on validated environment configuration
 * (getEnv()) is constructed lazily, on first use, and cached after — NOT at
 * module import time. Prisma-backed repositories that need no secrets are
 * constructed eagerly since they're inexpensive and side-effect-free
 * beyond holding a reference to the shared `prisma` client. This split
 * exists so that importing this module (e.g. transitively, via
 * `src/modules/auth/index.ts`) never requires JWT secrets or a database URL
 * to already be configured — only actually handling a request does. See
 * src/config/env.ts for the full rationale.
 */
import { getEnv } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { parseDurationMs } from "@/lib/duration";
import { LoginUseCase } from "../application/use-cases/login";
import { LogoutUseCase } from "../application/use-cases/logout";
import { RefreshAccessTokenUseCase } from "../application/use-cases/refresh-access-token";
import { BcryptPasswordHasher } from "./bcrypt-password-hasher";
import { JwtTokenService } from "./jwt-token-service";
import { PrismaUserRepository } from "./prisma-user-repository";
import { PrismaRefreshTokenRepository } from "./prisma-refresh-token-repository";
import { PrismaAuditRecorder } from "./prisma-audit-recorder";
import { SystemClock } from "./system-clock";
import { InMemoryRateLimiter } from "./rate-limiter";
import { createAuthMiddleware } from "../presentation/with-auth";

// No secrets required — safe to construct eagerly.
const userRepository = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);
const clock = new SystemClock();

let cachedPasswordHasher: BcryptPasswordHasher | undefined;
function getPasswordHasher(): BcryptPasswordHasher {
  return (cachedPasswordHasher ??= new BcryptPasswordHasher(getEnv().BCRYPT_COST_FACTOR));
}

let cachedTokenService: JwtTokenService | undefined;
function getTokenService(): JwtTokenService {
  if (!cachedTokenService) {
    const env = getEnv();
    cachedTokenService = new JwtTokenService({
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshHashSecret: env.JWT_REFRESH_SECRET,
    });
  }
  return cachedTokenService;
}

function getRefreshTokenTtlMs(): number {
  return parseDurationMs(getEnv().JWT_REFRESH_TTL);
}

let cachedLoginUseCase: LoginUseCase | undefined;
export function getLoginUseCase(): LoginUseCase {
  return (cachedLoginUseCase ??= new LoginUseCase({
    userRepository,
    refreshTokenRepository,
    passwordHasher: getPasswordHasher(),
    tokenService: getTokenService(),
    auditRecorder,
    clock,
    refreshTokenTtlMs: getRefreshTokenTtlMs(),
  }));
}

let cachedLogoutUseCase: LogoutUseCase | undefined;
export function getLogoutUseCase(): LogoutUseCase {
  return (cachedLogoutUseCase ??= new LogoutUseCase({
    refreshTokenRepository,
    tokenService: getTokenService(),
    auditRecorder,
  }));
}

let cachedRefreshAccessTokenUseCase: RefreshAccessTokenUseCase | undefined;
export function getRefreshAccessTokenUseCase(): RefreshAccessTokenUseCase {
  return (cachedRefreshAccessTokenUseCase ??= new RefreshAccessTokenUseCase({
    userRepository,
    refreshTokenRepository,
    tokenService: getTokenService(),
    auditRecorder,
    clock,
    refreshTokenTtlMs: getRefreshTokenTtlMs(),
  }));
}

// FR-AUTH-05 / NFR-SEC-07: 10 attempts per 15-minute window, keyed by
// email+IP at the call site (docs/security/14_Security_Architecture.md).
// No secrets involved — safe to construct eagerly.
export const loginRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});

/**
 * Bound auth middleware — other modules import this via `@/modules/auth`.
 * Resolves the real TokenService lazily, per request, so wrapping a handler
 * with `withAuth(...)` at module load time (as every route handler does)
 * never forces secret validation before the first real request arrives.
 */
export const withAuth = createAuthMiddleware({
  verifyAccessToken: (token: string) => getTokenService().verifyAccessToken(token),
});
