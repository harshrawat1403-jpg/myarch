import { hashOpaqueToken } from "@/lib/opaque-token";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { InvalidPasswordResetTokenError, PasswordResetTokenExpiredError } from "../../domain/errors";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { PasswordHasher } from "../ports/password-hasher";
import type { PasswordResetTokenRepository } from "../ports/password-reset-token-repository";
import type { RefreshTokenRepository } from "../ports/refresh-token-repository";
import type { UserRepository } from "../ports/user-repository";

export interface ResetPasswordInput {
  readonly token: string;
  readonly newPassword: string;
}

export interface ResetPasswordUseCaseDeps {
  userRepository: UserRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
  refreshTokenRepository: RefreshTokenRepository;
  passwordHasher: PasswordHasher;
  auditRecorder: AuditRecorder;
  hashSecret: string;
}

/**
 * Public, unauthenticated (proving control of the token IS the
 * authentication here — the same principle VerifyEmailUseCase follows).
 * Revokes every existing session for the account, mirroring
 * ChangeOwnPasswordUseCase's own session-revocation behavior: a password
 * reset (self-initiated or attacker-initiated via a compromised inbox)
 * should never leave a stale session valid elsewhere. Password policy is
 * enforced by ResetPasswordRequestSchema (presentation layer), not here —
 * matching ChangeOwnPasswordUseCase's own split (see that schema's doc
 * comment).
 */
export class ResetPasswordUseCase {
  constructor(private readonly deps: ResetPasswordUseCaseDeps) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashOpaqueToken(input.token, this.deps.hashSecret);
    const stored = await this.deps.passwordResetTokenRepository.findByTokenHash(tokenHash);
    if (!stored) throw new InvalidPasswordResetTokenError();

    if (stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new PasswordResetTokenExpiredError();
    }

    const passwordHash = await this.deps.passwordHasher.hash(input.newPassword);
    await this.deps.userRepository.setPassword(stored.userId, passwordHash);
    await this.deps.passwordResetTokenRepository.markConsumed(stored.id);
    await this.deps.refreshTokenRepository.revokeAllForUser(stored.userId);

    await this.deps.auditRecorder.record({
      actorUserId: stored.userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      targetEntityType: "User",
      targetEntityId: stored.userId,
      metadata: { via: "email_reset" },
    });
  }
}
