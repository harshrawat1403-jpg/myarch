import crypto from "node:crypto";

/**
 * Shared single-use opaque token primitive for email verification and
 * password reset (src/modules/auth's EmailVerificationToken/
 * PasswordResetToken) — mirrors JwtTokenService's own refresh-token
 * generation/hashing exactly (high-entropy random value, HMAC-hashed for
 * storage, never persisted in plaintext), reused here rather than
 * duplicated since both concerns (issue an opaque bearer secret, store only
 * its hash) are identical. Lives in src/lib/ rather than the auth module
 * because registration/recruiters/alumni all need to issue tokens too, and
 * "promote to src/lib on second use" is this codebase's established
 * convention for exactly this situation.
 *
 * Deliberately takes the HMAC secret as a parameter rather than calling
 * getEnv() internally — matching every other env-derived value in this
 * codebase (e.g. JwtTokenService's own refreshHashSecret config field):
 * env resolution stays in a container.ts composition root, so this stays a
 * plain, dependency-free function callable from a unit test without a full
 * validated environment.
 */

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(raw: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}
