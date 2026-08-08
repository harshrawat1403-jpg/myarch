import crypto from "node:crypto";

/**
 * Generates a temporary password for an admin-issued account creation or
 * password reset — 12 characters from the URL-safe base64 alphabet (mixed
 * case, digits, `-`/`_`), well above the strength meter's minimum bar and
 * short enough to relay verbally or type from a screen if copy/paste isn't
 * available. Never persisted in plaintext anywhere — the caller hashes it
 * immediately and surfaces it to the admin exactly once (see
 * admin-reset-password.ts).
 */
export function generateTempPassword(randomBytes: (size: number) => Buffer = crypto.randomBytes): string {
  return randomBytes(9).toString("base64url");
}
