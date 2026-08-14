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
import type { PrismaTransactionClient } from "@/lib/prisma";
import { parseDurationMs } from "@/lib/duration";
// V4.0 E1: imported from notifications' own infrastructure/container (not
// the "@/modules/notifications" barrel) deliberately. The barrel now also
// re-exports IN_APP-notification-center route handlers that import
// `withAuth` from this very module — going through the barrel here would
// make this file (loaded while @/modules/auth's own barrel is still
// mid-initialization) require `withAuth` before auth finishes exporting it,
// a genuine circular-import TDZ failure. This deep import needs only the
// bound `notificationService` singleton, which has no dependency on auth.
import { notificationService, sendDirectEmail } from "@/modules/notifications/infrastructure/container";
// Type-only, so (unlike the value import above) it can safely come through
// the public barrel — erased at compile time, no circular-import TDZ risk.
import type { NotificationService } from "@/modules/notifications";
import { saveFile, deleteFile } from "@/lib/file-storage";
import { LoginUseCase } from "../application/use-cases/login";
import { LogoutUseCase } from "../application/use-cases/logout";
import { RefreshAccessTokenUseCase } from "../application/use-cases/refresh-access-token";
import { AdminResetPasswordUseCase } from "../application/use-cases/admin-reset-password";
import { ChangeOwnPasswordUseCase } from "../application/use-cases/change-own-password";
import { UpdateOwnProfileUseCase } from "../application/use-cases/update-own-profile";
import { UploadAvatarUseCase } from "../application/use-cases/upload-avatar";
import { IssueEmailVerificationTokenUseCase } from "../application/use-cases/issue-email-verification";
import { VerifyEmailUseCase } from "../application/use-cases/verify-email";
import { ResendEmailVerificationUseCase } from "../application/use-cases/resend-email-verification";
import { ForgotPasswordUseCase } from "../application/use-cases/forgot-password";
import { ResetPasswordUseCase } from "../application/use-cases/reset-password";
import { BcryptPasswordHasher } from "./bcrypt-password-hasher";
import { JwtTokenService } from "./jwt-token-service";
import { PrismaUserRepository } from "./prisma-user-repository";
import { PrismaRefreshTokenRepository } from "./prisma-refresh-token-repository";
import { PrismaAuditRecorder } from "./prisma-audit-recorder";
import { PrismaProfileNameRepository } from "./prisma-profile-name-repository";
import { PrismaAvatarFileRepository } from "./prisma-avatar-file-repository";
import { PrismaEmailVerificationTokenRepository } from "./prisma-email-verification-token-repository";
import { PrismaPasswordResetTokenRepository } from "./prisma-password-reset-token-repository";
import { SystemClock } from "./system-clock";
import { createAuthMiddleware } from "../presentation/with-auth";

// No secrets required — safe to construct eagerly.
const userRepository = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);
const profileNameRepository = new PrismaProfileNameRepository(prisma);
const avatarFileRepository = new PrismaAvatarFileRepository(prisma);
const emailVerificationTokenRepository = new PrismaEmailVerificationTokenRepository(prisma);
const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository(prisma);
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

/**
 * Transaction-scoped variant of getAdminResetPasswordUseCase(), for a caller
 * that must run a password reset inside a larger atomic Prisma transaction
 * (registration's approval flow — see
 * modules/registration/infrastructure/container.ts). Always builds a fresh
 * instance bound to the given client, unlike the cached singleton above. The
 * caller supplies its own NotificationService — e.g. one that defers the
 * resulting ACCOUNT_CREDENTIALS_ISSUED notification until the transaction
 * has actually committed, rather than this module's regular notify-
 * immediately singleton.
 */
export function buildAdminResetPasswordUseCase(
  client: PrismaTransactionClient,
  txNotificationService: NotificationService,
): AdminResetPasswordUseCase {
  return new AdminResetPasswordUseCase({
    userRepository: new PrismaUserRepository(client),
    refreshTokenRepository: new PrismaRefreshTokenRepository(client),
    passwordHasher: getPasswordHasher(),
    auditRecorder: new PrismaAuditRecorder(client),
    notificationService: txNotificationService,
  });
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

/**
 * MYARCH Phase 1 (§2.4) — recruiter/alumni self-signup hash their own
 * caller-chosen password (no existing auth primitive does this; every
 * other account-creation path generates its own temp password). Exposed
 * as a plain function rather than PasswordHasher/BcryptPasswordHasher
 * itself, mirroring revokeUserSessions's exact reasoning — other modules
 * never depend on auth's infrastructure layer directly.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return getPasswordHasher().hash(plaintext);
}

/** Backs the /api/auth/me route's email/fullName fields — see me.ts's doc comment. */
export async function getMeProfile(actor: {
  userId: string;
  role: import("../domain/entities").Role;
}): Promise<{ email: string | null; fullName: string | null; avatarUrl: string | null }> {
  const user = await userRepository.findById(actor.userId);
  const fullName = await profileNameRepository
    .getFullName(actor.userId, actor.role)
    .catch(() => null);
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

let cachedIssueEmailVerificationTokenUseCase: IssueEmailVerificationTokenUseCase | undefined;
export function getIssueEmailVerificationTokenUseCase(): IssueEmailVerificationTokenUseCase {
  return (cachedIssueEmailVerificationTokenUseCase ??= new IssueEmailVerificationTokenUseCase({
    emailVerificationTokenRepository,
    sendEmail: sendDirectEmail,
    appBaseUrl: getEnv().APP_BASE_URL,
    hashSecret: getEnv().JWT_REFRESH_SECRET,
  }));
}

let cachedVerifyEmailUseCase: VerifyEmailUseCase | undefined;
export function getVerifyEmailUseCase(): VerifyEmailUseCase {
  return (cachedVerifyEmailUseCase ??= new VerifyEmailUseCase({
    emailVerificationTokenRepository,
    userRepository,
    hashSecret: getEnv().JWT_REFRESH_SECRET,
  }));
}

let cachedResendEmailVerificationUseCase: ResendEmailVerificationUseCase | undefined;
export function getResendEmailVerificationUseCase(): ResendEmailVerificationUseCase {
  return (cachedResendEmailVerificationUseCase ??= new ResendEmailVerificationUseCase({
    emailVerificationTokenRepository,
    sendEmail: sendDirectEmail,
    appBaseUrl: getEnv().APP_BASE_URL,
    hashSecret: getEnv().JWT_REFRESH_SECRET,
  }));
}

let cachedForgotPasswordUseCase: ForgotPasswordUseCase | undefined;
export function getForgotPasswordUseCase(): ForgotPasswordUseCase {
  return (cachedForgotPasswordUseCase ??= new ForgotPasswordUseCase({
    userRepository,
    passwordResetTokenRepository,
    sendEmail: sendDirectEmail,
    appBaseUrl: getEnv().APP_BASE_URL,
    hashSecret: getEnv().JWT_REFRESH_SECRET,
  }));
}

let cachedResetPasswordUseCase: ResetPasswordUseCase | undefined;
export function getResetPasswordUseCase(): ResetPasswordUseCase {
  return (cachedResetPasswordUseCase ??= new ResetPasswordUseCase({
    userRepository,
    passwordResetTokenRepository,
    refreshTokenRepository,
    passwordHasher: getPasswordHasher(),
    hashSecret: getEnv().JWT_REFRESH_SECRET,
    auditRecorder,
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
