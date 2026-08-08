/**
 * Codifies the permissions matrix in docs/security/09_User_Roles_and_Permissions.md.
 * This is the single source of truth for authorization decisions — every
 * route handler and use case must check permissions through these functions,
 * never re-implement a role/scope check inline
 * (docs/security/14_Security_Architecture.md, "Authorization: Strict RBAC").
 *
 * Each function name states the capability it checks, matching a row in the
 * permissions matrix, so this file can be reviewed side-by-side with that
 * document to confirm they still agree.
 */

import type { AuthenticatedActor } from "./entities";

function isScopedToBatch(actor: AuthenticatedActor, batchId: string): boolean {
  return (actor.batchScope ?? []).includes(batchId);
}

/** Private Profile: CGPA, backlog, contact info, internal remarks. */
export function canViewPrivateProfile(
  actor: AuthenticatedActor,
  targetBatchId: string,
  targetStudentProfileId: string,
): boolean {
  switch (actor.role) {
    case "SECRETARY":
      return true;
    case "COORDINATOR":
      return isScopedToBatch(actor, targetBatchId);
    case "STUDENT":
      return actor.studentProfileId === targetStudentProfileId;
    case "RECRUITER":
      return false;
  }
}

/** CGPA, backlog status, internal remarks — department-entered fields only. */
export function canEditPrivateAdminFields(actor: AuthenticatedActor, targetBatchId: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isScopedToBatch(actor, targetBatchId);
  return false;
}

/** A student's own phone / personal email — the one Private field they may edit. */
export function canEditOwnContactInfo(actor: AuthenticatedActor, targetStudentProfileId: string): boolean {
  return actor.role === "STUDENT" && actor.studentProfileId === targetStudentProfileId;
}

export function canEditPublicProfileDraft(
  actor: AuthenticatedActor,
  targetBatchId: string,
  targetStudentProfileId: string,
): boolean {
  switch (actor.role) {
    case "SECRETARY":
      return true;
    case "COORDINATOR":
      return isScopedToBatch(actor, targetBatchId);
    case "STUDENT":
      return actor.studentProfileId === targetStudentProfileId;
    case "RECRUITER":
      return false;
  }
}

export function canApproveOrRejectDraft(actor: AuthenticatedActor, targetBatchId: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isScopedToBatch(actor, targetBatchId);
  return false;
}

/** Approved (published) profiles only — never a pending draft, for any role. */
export function canViewApprovedPublicProfile(actor: AuthenticatedActor): boolean {
  return (
    actor.role === "SECRETARY" ||
    actor.role === "COORDINATOR" ||
    actor.role === "STUDENT" ||
    actor.role === "RECRUITER"
  );
}

/**
 * The recruiter directory/profile/stats/resume surface (Days 8–9) is
 * Recruiter-only — unlike canViewApprovedPublicProfile above, which is
 * deliberately permissive to all four roles because Secretary/Coordinator/
 * Student each reach an approved profile through their OWN admin/self
 * endpoints (docs/database's Days 5–6 GetPublishedProfileUseCase). Those
 * are different code paths with different scoping rules; a Recruiter's
 * directory has none of that scoping (every recruiter sees the same
 * data), so it gets its own single-role check rather than overloading the
 * broader function.
 */
export function canAccessRecruiterDirectory(actor: AuthenticatedActor): boolean {
  return actor.role === "RECRUITER";
}

export function canManageBatches(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canManageCoordinatorAccounts(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canExportBatchData(actor: AuthenticatedActor, targetBatchId: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isScopedToBatch(actor, targetBatchId);
  return false;
}

export function canViewAuditLogs(actor: AuthenticatedActor, targetBatchId?: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR" && targetBatchId) return isScopedToBatch(actor, targetBatchId);
  return false;
}

export function canChangeBatchLifecycleStatus(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

/**
 * V3.0 User Directory (merged with Role Management — a read-only,
 * cross-role search, never a role-change control). A Secretary sees every
 * role; a Coordinator sees only Students within their batch scope (the
 * directory's repository layer enforces that narrowing at the query level,
 * mirroring PrismaStudentRepository.search — this function only gates
 * whether the endpoint may be called at all).
 */
export function canAccessUserDirectory(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR";
}
