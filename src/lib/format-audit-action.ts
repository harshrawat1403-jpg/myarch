const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILED: "Failed sign-in attempt",
  LOGOUT: "Signed out",
  PROFILE_APPROVED: "Profile approved",
  PROFILE_CHANGES_REQUESTED: "Changes requested",
  PROFILE_DRAFT_SUBMITTED: "Draft submitted",
  REFRESH_TOKEN_REUSE_DETECTED: "Suspicious session activity",
};

/**
 * Audit entries store their action as a stable, uppercase-with-underscore
 * code (`LOGIN_SUCCESS`) — correct as a system-of-record value, but reads
 * as raw enum text in a UI meant to feel like a product, not a log
 * viewer. This is presentation-only: the underlying data and the DB value
 * are untouched, only how it's displayed. Unrecognized actions (a future
 * audit event this map hasn't been updated for) fall back to a plain
 * title-cased rendering rather than silently hiding the entry.
 */
export function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
