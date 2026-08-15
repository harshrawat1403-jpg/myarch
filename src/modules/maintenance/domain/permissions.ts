import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { MaintenanceIssueRecord } from "./entities";

/**
 * MYARCH Maintenance functional hierarchy — the ONLY place in the codebase
 * MAINTENANCE_SECRETARY is treated as unconditional access, exactly the
 * way SECRETARY itself is treated everywhere. Deliberately local to this
 * file: a Maintenance Secretary is still an ordinary Coordinator in every
 * other domain (auth/permissions.ts's canManageCoordinatorAccounts, every
 * other module's own permission functions) — this helper must never be
 * imported or mirrored outside src/modules/maintenance.
 */
function isMaintenanceSecretary(actor: AuthenticatedActor): boolean {
  return actor.role === "COORDINATOR" && actor.maintenanceRole === "MAINTENANCE_SECRETARY";
}

/** Anyone with an on-campus account may report a facility issue — Recruiter/Alumni excluded (not applicable to their role). */
export function canReportMaintenanceIssue(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR" || actor.role === "STUDENT";
}

/**
 * Secretary (and a Maintenance Secretary, unconditionally within this
 * domain) unscoped. Coordinator: delegated `maintenance.view` sees every
 * issue, otherwise only ones assigned to them. Student (the complainant):
 * only their own reported issue — "cannot access other students' private
 * records."
 */
export function canViewMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "requesterId" | "assigneeId">,
): boolean {
  if (actor.role === "SECRETARY" || isMaintenanceSecretary(actor)) return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "maintenance.view") || actor.userId === issue.assigneeId;
  }
  if (actor.role === "STUDENT") return actor.userId === issue.requesterId;
  return false;
}

/**
 * Acknowledge/update priority-deadline/reassign/resolve/verify/close —
 * delegated `maintenance.manage`, or the Coordinator currently assigned to
 * it. Kept as the broad umbrella exactly as before: `maintenance.manage`
 * MUST keep implying every one of the narrower canUpdate/canResolve/
 * canReassignMaintenanceIssue checks below, so no Coordinator who already
 * holds it loses any capability — see this module's own architecture
 * amendment notes.
 */
export function canManageMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "assigneeId">,
): boolean {
  if (actor.role === "SECRETARY" || isMaintenanceSecretary(actor)) return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "maintenance.manage") || actor.userId === issue.assigneeId;
  }
  return false;
}

/** Assignment specifically — `maintenance.assign` (a narrower, delegable capability) or the broader `maintenance.manage`. */
export function canAssignMaintenanceIssue(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY" || isMaintenanceSecretary(actor)) return true;
  if (actor.role === "COORDINATOR") {
    return hasCoordinatorPermission(actor, "maintenance.assign") || hasCoordinatorPermission(actor, "maintenance.manage");
  }
  return false;
}

/**
 * MYARCH Maintenance functional hierarchy — narrower delegation alongside
 * canManageMaintenanceIssue, for a Coordinator granted `maintenance.update`
 * without the full `maintenance.manage` umbrella. Anyone canManageMaintenanceIssue
 * already covers (Secretary, Maintenance Secretary, maintenance.manage,
 * the current assignee) is unaffected — this only ever WIDENS who may
 * update field values, never narrows the existing check.
 */
export function canUpdateMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "assigneeId">,
): boolean {
  if (canManageMaintenanceIssue(actor, issue)) return true;
  return actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "maintenance.update");
}

/** Same shape as canUpdateMaintenanceIssue, for `maintenance.resolve`. */
export function canResolveMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "assigneeId">,
): boolean {
  if (canManageMaintenanceIssue(actor, issue)) return true;
  return actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "maintenance.resolve");
}

/** Same shape as canUpdateMaintenanceIssue, for `maintenance.reassign` — distinct from the initial `maintenance.assign` (canAssignMaintenanceIssue), which canManageMaintenanceIssue/canAssignMaintenanceIssue already cover. */
export function canReassignMaintenanceIssue(actor: AuthenticatedActor): boolean {
  if (canAssignMaintenanceIssue(actor)) return true;
  return actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "maintenance.reassign");
}

/** §3.4 — "allow Confirm Resolved" is the complainant's own action (or the Secretary's/Maintenance Secretary's, for oversight). */
export function canConfirmMaintenanceResolution(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "requesterId">,
): boolean {
  if (actor.role === "SECRETARY" || isMaintenanceSecretary(actor)) return true;
  return actor.userId === issue.requesterId;
}

/** §3.4/§3.5 — "allow Reopen" is available to whoever manages the issue AND to the complainant who reported it. */
export function canReopenMaintenanceIssue(
  actor: AuthenticatedActor,
  issue: Pick<MaintenanceIssueRecord, "assigneeId" | "requesterId">,
): boolean {
  return canManageMaintenanceIssue(actor, issue) || actor.userId === issue.requesterId;
}

/**
 * MYARCH Maintenance functional hierarchy — gates the Maintenance
 * workspace's "Tasks" tab (aggregated maintenance-related Task Engine
 * rows). This only decides whether the tab is reachable; the actual tasks
 * a Coordinator sees inside it are still scoped by Task Engine's own
 * canViewTask/SearchTasksUseCase (owner-or-creator for a Coordinator) —
 * this permission does not widen Task Engine visibility, it only unlocks
 * the entry point.
 */
export function canViewMaintenanceTasks(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY" || isMaintenanceSecretary(actor)) return true;
  if (actor.role === "COORDINATOR") {
    return (
      hasCoordinatorPermission(actor, "maintenance.tasks") ||
      hasCoordinatorPermission(actor, "maintenance.manage")
    );
  }
  return false;
}

/**
 * Gates the Maintenance Dashboard/analytics. `maintenance.view` is included
 * alongside `maintenance.reports`/`maintenance.manage` deliberately — this
 * exactly preserves GetMaintenanceDashboardStatsUseCase's pre-existing
 * check (view OR manage), which already granted dashboard access to a
 * Coordinator holding only `maintenance.view`; narrowing that away here
 * would silently remove an existing capability, which this amendment must
 * not do.
 */
export function canViewMaintenanceReports(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY" || isMaintenanceSecretary(actor)) return true;
  if (actor.role === "COORDINATOR") {
    return (
      hasCoordinatorPermission(actor, "maintenance.view") ||
      hasCoordinatorPermission(actor, "maintenance.reports") ||
      hasCoordinatorPermission(actor, "maintenance.manage")
    );
  }
  return false;
}
