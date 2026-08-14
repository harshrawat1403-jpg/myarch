import type { MaintenanceIssueStatus } from "./entities";

/**
 * §3.3's documented chain: SUBMITTED → ACKNOWLEDGED → ASSIGNED →
 * IN_PROGRESS → RESOLVED → VERIFIED → CLOSED. REOPENED is reachable only
 * from a post-resolution state via the distinct ReopenMaintenanceIssueUseCase
 * (not a forward transition through this map — mirrors Task's own
 * TODO/task-status.ts split between ordinary transitions and reopen).
 * REOPENED itself resumes at ASSIGNED or IN_PROGRESS — the issue already has
 * a known assignee, so it never re-enters ACKNOWLEDGED.
 */
const ALLOWED_TRANSITIONS: Record<MaintenanceIssueStatus, readonly MaintenanceIssueStatus[]> = {
  SUBMITTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["VERIFIED"],
  VERIFIED: ["CLOSED"],
  CLOSED: [],
  REOPENED: ["ASSIGNED", "IN_PROGRESS"],
};

export function isValidMaintenanceIssueTransition(from: MaintenanceIssueStatus, to: MaintenanceIssueStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
