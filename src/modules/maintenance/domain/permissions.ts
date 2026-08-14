import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { MaintenanceIssueRecord } from "./entities";

/** Anyone with an on-campus account may report a facility issue — Recruiter/Alumni excluded (not applicable to their role). */
export function canReportMaintenanceIssue(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR" || actor.role === "STUDENT";
}

/**
 * Secretary unscoped. Coordinator: delegated `maintenance.view` sees every
 * issue, otherwise only ones assigned to them. Student (the complainant):
 * only their own reported issue — "cannot access other students' private
 * records."
 */
export function canViewMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "requesterId" | "assigneeId">,
): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "maintenance.view") || actor.userId === issue.assigneeId;
  }
  if (actor.role === "STUDENT") return actor.userId === issue.requesterId;
  return false;
}

/** Acknowledge/update priority-deadline/reassign/resolve/verify/close — delegated `maintenance.manage`, or the Coordinator currently assigned to it. */
export function canManageMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "assigneeId">,
): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "maintenance.manage") || actor.userId === issue.assigneeId;
  }
  return false;
}

/** Assignment specifically — `maintenance.assign` (a narrower, delegable capability) or the broader `maintenance.manage`. */
export function canAssignMaintenanceIssue(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "maintenance.assign") || hasCoordinatorPermission(actor, "maintenance.manage");
  }
  return false;
}

/** §3.4 — "allow Confirm Resolved" is the complainant's own action (or the Secretary's, for oversight). */
export function canConfirmMaintenanceResolution(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "requesterId">,
): boolean {
  if (actor.role === "SECRETARY") return true;
  return actor.userId === issue.requesterId;
}

/** §3.4/§3.5 — "allow Reopen" is available to whoever manages the issue AND to the complainant who reported it. */
export function canReopenMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "assigneeId" | "requesterId">,
): boolean {
  return canManageMaintenanceIssue(actor, issue) || actor.userId === issue.requesterId;
}
