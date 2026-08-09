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
// V4.0 E1: imported from notifications' own infrastructure/container (not
// the "@/modules/notifications" barrel) deliberately. The barrel now also
// re-exports IN_APP-notification-center route handlers that import
// `withAuth` from this very module — going through the barrel here would
// make this file (loaded while @/modules/auth's own barrel is still
// mid-initialization) require `withAuth` before auth finishes exporting it,
// a genuine circular-import TDZ failure. This deep import needs only the
// bound `notificationService` singleton, which has no dependency on auth.
import { notificationService } from "@/modules/notifications/infrastructure/container";
import { saveFile, deleteFile } from "@/lib/file-storage";
import { LoginUseCase } from "../application/use-cases/login";
import { LogoutUseCase } from "../application/use-cases/logout";
import { RefreshAccessTokenUseCase } from "../application/use-cases/refresh-access-token";
import { AdminResetPasswordUseCase } from "../application/use-cases/admin-reset-password";
import { ChangeOwnPasswordUseCase } from "../application/use-cases/change-own-password";
import { UpdateOwnProfileUseCase } from "../application/use-cases/update-own-profile";
import { UploadAvatarUseCase } from "../application/use-cases/upload-avatar";
import { BcryptPasswordHasher } from "./bcrypt-password-hasher";
import { JwtTokenService } from "./jwt-token-service";
import { PrismaUserRepository } from "./prisma-user-repository";
import { PrismaRefreshTokenRepository } from "./prisma-refresh-token-repository";
import { PrismaAuditRecorder } from "./prisma-audit-recorder";
import { PrismaProfileNameRepository } from "./prisma-profile-name-repository";
import { PrismaAvatarFileRepository } from "./prisma-avatar-file-repository";
import { SystemClock } from "./system-clock";
import { createAuthMiddleware } from "../presentation/with-auth";

// No secrets required — safe to construct eagerly.
const userRepository = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);
const profileNameRepository = new PrismaProfileNameRepository(prisma);
const avatarFileRepository = new PrismaAvatarFileRepository(prisma);
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

let cachedAdminResetPasswordUseCase: AdminResetPasswordUseCase | undefined;
export function getAdminResetPasswordUseCase(): AdminResetPasswordUseCase {
  return (cachedAdminResetPasswordUseCase ??= new AdminResetPasswordUseCase({
    userRepository,
    refreshTokenRepository,
    passwordHasher: getPasswordHasher(),
    auditRecorder,
    notificationService,
  }));
}

let cachedChangeOwnPasswordUseCase: ChangeOwnPasswordUseCase | undefined;
export function getChangeOwnPasswordUseCase(): ChangeOwnPasswordUseCase {
  return (cachedChangeOwnPasswordUseCase ??= new ChangeOwnPasswordUseCase({
    userRepository,
    refreshTokenRepository,
    passwordHasher: getPasswordHasher(),
    auditRecorder,
    tokenService: getTokenService(),
    clock,
    refreshTokenTtlMs: getRefreshTokenTtlMs(),
  }));
}

/** Exposed for the /api/files/[fileId] route (reads a PUBLIC FileAsset by id — avatars today). */
export function getAvatarFileRepository(): PrismaAvatarFileRepository {
  return avatarFileRepository;
}

/**
 * V3.0: revokes every session for a user — used by Coordinator/Recruiter
 * disable (kills access immediately, same pattern AdminResetPasswordUseCase
 * already established for password resets). Exposed as a plain function
 * rather than the repository itself, so other modules never depend on
 * auth's infrastructure layer directly.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  await refreshTokenRepository.revokeAllForUser(userId);
}

/** Backs the /api/auth/me route's email/fullName fields — see me.ts's doc comment. */
export async function getMeProfile(actor: {
  userId: string;
  role: import("../domain/entities").Role;
}): Promise<{ email: string | null; fullName: string | null; avatarUrl: string | null }> {
  const user = await userRepository.findById(actor.userId);
  const fullName = await profileNameRepository.getFullName(actor.userId, actor.role).catch(() => null);
  return {
    email: user?.email ?? null,
    fullName,
    avatarUrl: user?.avatarFileId ? `/api/files/${user.avatarFileId}` : null,
  };
}

let cachedUpdateOwnProfileUseCase: UpdateOwnProfileUseCase | undefined;
export function getUpdateOwnProfileUseCase(): UpdateOwnProfileUseCase {
  return (cachedUpdateOwnProfileUseCase ??= new UpdateOwnProfileUseCase({
    userRepository,
    profileNameRepository,
    passwordHasher: getPasswordHasher(),
    auditRecorder,
  }));
}

let cachedUploadAvatarUseCase: UploadAvatarUseCase | undefined;
export function getUploadAvatarUseCase(): UploadAvatarUseCase {
  return (cachedUploadAvatarUseCase ??= new UploadAvatarUseCase({
    userRepository,
    avatarFileRepository,
    auditRecorder,
    saveFile,
    deleteFile,
  }));
}

/**
 * Bound auth middleware — other modules import this via `@/modules/auth`.
 * Resolves the real TokenService lazily, per request, so wrapping a handler
 * with `withAuth(...)` at module load time (as every route handler does)
 * never forces secret validation before the first real request arrives.
 */
export const withAuth = createAuthMiddleware({
  verifyAccessToken: (token: string) => getTokenService().verifyAccessToken(token),
});
