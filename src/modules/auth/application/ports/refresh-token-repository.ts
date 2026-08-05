/**
 * A stored refresh token record. `tokenHash` is a deterministic keyed hash of
 * the raw token (see TokenService.hashRefreshToken) — the raw token itself is
 * never persisted (docs/security/14_Security_Architecture.md).
 *
 * `familyId` groups every token issued within one login session across
 * rotations, so reuse of any revoked token in the family can revoke the
 * whole family at once.
 */
export interface StoredRefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly familyId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly replacedById: string | null;
}

export interface RefreshTokenRepository {
  create(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<StoredRefreshToken>;

  findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null>;

  /** Marks a single token revoked, optionally linking to the token that replaced it. */
  revoke(id: string, replacedById?: string): Promise<void>;

  /** Revokes every currently-unrevoked token in a family (logout, or reuse detection). */
  revokeFamily(familyId: string): Promise<void>;
}
