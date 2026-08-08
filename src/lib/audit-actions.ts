/**
 * Central registry of AuditLog.action strings for the V3.0 Administration
 * Platform. Every existing module (auth, profiles) writes its own literal
 * string inline at the call site — that convention predates this file and
 * is left alone (retrofitting frozen, working modules is out of scope).
 * This registry exists because V3.0 adds many new action types across
 * several new modules at once, where free-form inline strings would
 * otherwise drift/typo across call sites with no central place to check
 * against.
 */
export const AUDIT_ACTIONS = {
  COORDINATOR_CREATED: "COORDINATOR_CREATED",
  COORDINATOR_UPDATED: "COORDINATOR_UPDATED",
  COORDINATOR_DISABLED: "COORDINATOR_DISABLED",
  COORDINATOR_ENABLED: "COORDINATOR_ENABLED",
  COORDINATOR_BATCH_ASSIGNED: "COORDINATOR_BATCH_ASSIGNED",
  COORDINATOR_BATCH_REMOVED: "COORDINATOR_BATCH_REMOVED",

  RECRUITER_CREATED: "RECRUITER_CREATED",
  RECRUITER_UPDATED: "RECRUITER_UPDATED",
  RECRUITER_APPROVED: "RECRUITER_APPROVED",
  RECRUITER_REJECTED: "RECRUITER_REJECTED",
  RECRUITER_DISABLED: "RECRUITER_DISABLED",
  RECRUITER_ENABLED: "RECRUITER_ENABLED",

  PASSWORD_RESET: "PASSWORD_RESET",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",

  BULK_STUDENT_IMPORT_STARTED: "BULK_STUDENT_IMPORT_STARTED",
  BULK_STUDENT_IMPORT_COMPLETED: "BULK_STUDENT_IMPORT_COMPLETED",
  /** metadata: { entityType, operation, count }. */
  BULK_OPERATION: "BULK_OPERATION",

  ACADEMIC_YEAR_TRANSITION_STARTED: "ACADEMIC_YEAR_TRANSITION_STARTED",
  ACADEMIC_YEAR_TRANSITION_COMPLETED: "ACADEMIC_YEAR_TRANSITION_COMPLETED",

  ACCOUNT_SETTINGS_UPDATED: "ACCOUNT_SETTINGS_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
