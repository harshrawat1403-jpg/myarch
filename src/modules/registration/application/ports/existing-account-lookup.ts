/**
 * A minimal, read-only port for checking whether an email/roll number is
 * already a real account — mirrors src/lib/batch-lookup.ts's "narrow
 * cross-module read" pattern for a single-database modular monolith. Kept
 * local to this module (not yet promoted to src/lib/) since registration is
 * its only consumer so far — promote on a second use, per the codebase's
 * established convention.
 */
export interface ExistingAccountLookup {
  emailInUse(email: string): Promise<boolean>;
  rollNumberInUse(rollNumber: string): Promise<boolean>;
}
