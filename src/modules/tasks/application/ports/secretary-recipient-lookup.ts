/**
 * EscalateTaskUseCase/the overdue-check job handler need every active
 * Secretary's userId to resolve escalation's server-side (never client-
 * chosen) target. Mirrors recruiters/alumni's identically-named port,
 * re-declared here rather than imported — this module's own isolation
 * convention (see domain/errors.ts and every other MYARCH-phase module).
 */
export interface SecretaryRecipientLookup {
  listActiveSecretaryUserIds(): Promise<string[]>;
}
