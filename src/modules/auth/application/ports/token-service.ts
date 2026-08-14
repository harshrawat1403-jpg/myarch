import type { Role } from "../../domain/entities";

/** Claims embedded in the short-lived access token JWT. */
export interface AccessTokenClaims {
  /** Subject — the user's ID. */
  readonly sub: string;
  readonly role: Role;
  readonly batchScope?: readonly string[];
  /** See AuthenticatedActor.permissions's doc comment (domain/entities.ts). */
  readonly permissions?: readonly string[];
  readonly studentProfileId?: string;
  readonly mustChangePassword?: boolean;
}

export interface TokenService {
  /** Signs a short-lived access token. Throws only on a misconfigured signer. */
  signAccessToken(claims: AccessTokenClaims): string;

  /**
   * Verifies and decodes an access token. Throws (any Error) if the token is
   * missing, malformed, expired, or has an invalid signature — the caller
   * (auth middleware) treats any throw here as "unauthenticated."
   */
  verifyAccessToken(token: string): AccessTokenClaims;

  /** Generates a new, high-entropy, opaque refresh token (not a JWT). */
  generateRefreshToken(): string;

  /**
   * Deterministically hashes a raw refresh token for storage/lookup. Not
   * bcrypt: refresh tokens are already high-entropy random secrets (unlike
   * user-chosen passwords), so a fast, deterministic keyed hash (HMAC) is the
   * correct tool — it allows an indexed point-lookup by hash, which a
   * salted, non-deterministic hash (bcrypt) cannot support. See
   * docs/security/14_Security_Architecture.md and the Days 2–3 implementation
   * summary for the full rationale.
   */
  hashRefreshToken(raw: string): string;
}
