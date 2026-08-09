/**
 * V4.0 C3 — §7 step 7's "acceptance notifies the Secretary to facilitate the
 * connection" needs every active Secretary's userId (there is no existing
 * "list users by role" primitive to reuse). Narrow and read-only, same
 * pattern as student-name-lookup.ts.
 */
export interface SecretaryRecipientLookup {
  listActiveSecretaryUserIds(): Promise<string[]>;
}
