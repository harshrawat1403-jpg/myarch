/**
 * A stored email-verification token. `tokenHash` mirrors RefreshToken's own
 * convention — the raw token is never persisted (see src/lib/opaque-token.ts).
 * Exactly one of `userId`/`registrationRequestId` is set per row — see
 * EmailVerificationToken's own schema doc comment for why one shape serves
 * both cases (RECRUITER/ALUMNI self-signup already has a User; STUDENT
 * registration does not, until Secretary approval).
 */
export interface StoredEmailVerificationToken {
  readonly id: string;
  readonly email: string;
  readonly tokenHash: string;
  readonly userId: string | null;
  readonly registrationRequestId: string | null;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
}

export interface EmailVerificationTokenRepository {
  create(data: {
    email: string;
    tokenHash: string;
    userId?: string;
    registrationRequestId?: string;
    expiresAt: Date;
  }): Promise<StoredEmailVerificationToken>;

  findByTokenHash(tokenHash: string): Promise<StoredEmailVerificationToken | null>;

  markConsumed(id: string): Promise<void>;

  /**
   * ResendEmailVerificationUseCase's lookup — the most recent token issued
   * for an email, in ANY state (consumed, expired, or still pending), so a
   * resend can tell apart "never signed up" (nothing found — say nothing),
   * "already verified" (found, consumed — say nothing, no re-send needed),
   * and "pending" (found, not consumed — re-issue and re-send to the same
   * target). Deliberately not restricted to still-usable rows: an expired
   * pending token still identifies who to resend to.
   */
  findLatestByEmail(email: string): Promise<StoredEmailVerificationToken | null>;
}
