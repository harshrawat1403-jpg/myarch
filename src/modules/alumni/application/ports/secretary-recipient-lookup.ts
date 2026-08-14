/**
 * MYARCH Phase 1 (§2.4) — SignupAlumniUseCase needs every active Secretary's
 * userId to notify them of a pending self-signup. Mirrors
 * recruiters/application/ports/secretary-recipient-lookup.ts exactly,
 * re-declared here rather than imported (this module's own isolation
 * convention — see domain/errors.ts's doc comment).
 */
export interface SecretaryRecipientLookup {
  listActiveSecretaryUserIds(): Promise<string[]>;
}
