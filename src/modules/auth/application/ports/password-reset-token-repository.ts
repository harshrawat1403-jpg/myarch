/** A stored password-reset token. `tokenHash` mirrors RefreshToken's own convention — the raw token is never persisted. */
export interface StoredPasswordResetToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
}

export interface PasswordResetTokenRepository {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<StoredPasswordResetToken>;

  findByTokenHash(tokenHash: string): Promise<StoredPasswordResetToken | null>;

  markConsumed(id: string): Promise<void>;
}
