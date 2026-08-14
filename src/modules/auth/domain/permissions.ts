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
    case "ALUMNI":
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
    case "ALUMNI":
      return false;
  }
}

/**
 * V4.0 (Q1 decision, docs/planning/V4_0_PRD.md §5.2/§24): the Secretary is
 * the sole final approval authority platform-wide — this now applies to
 * profile-draft approval exactly as it already applied to registration
 * requests. Replaces the former `canApproveOrRejectDraft`, which granted a
 * batch-scoped Coordinator the same approve/reject power as the Secretary;
 * that was live V2.0 behavior, not a bug, but the V4.0 approval explicitly
 * requires narrowing it. A Coordinator's remaining authority over a draft —
 * review and request changes, never a final decision — is
 * `canRequestProfileChanges` below.
 */
export function canApprovePublicProfile(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

/**
 * Coordinator's (either position — see CoordinatorProfile.position, a
 * display label only, never read here) authority over a profile draft:
 * review and request changes, batch-scoped, same as every other
 * Coordinator capability. Never final — see `canApprovePublicProfile`.
 */
export function canRequestProfileChanges(actor: AuthenticatedActor, targetBatchId: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isScopedToBatch(actor, targetBatchId);
  return false;
}

// V4.0 B2 (§4's permission matrix — "Mark registration Reviewed / Needs
// Attention" is Scoped for both Coordinator and Secretary): identical shape
// to canRequestProfileChanges — Secretary is unscoped by design, Coordinator
// is batch-scoped. Marking is advisory, never a decision (§9).
export function canReviewRegistrationRequest(actor: AuthenticatedActor, targetBatchId: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isScopedToBatch(actor, targetBatchId);
  return false;
}

// V4.0 B3 (Q1): Secretary is the sole final approval authority for
// registration requests too, platform-wide, unscoped — same split as
// canApprovePublicProfile vs canRequestProfileChanges.
export function canDecideRegistrationRequest(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
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

// V4.0 A4: Company is Secretary-managed, Coordinator-viewable (§4 of the
// V4.0 PRD) — the same manage-vs-view split as canManageBatches's implicit
// pairing with read access, made explicit here since Company has no
// existing "everyone with dashboard access can read" endpoint to piggyback
// on the way batches do.
export function canManageCompanies(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canViewCompanies(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR";
}

// V4.0 D1 (§4's permission matrix — "Manage placement drives: Coordinator:
// Scoped, no publish; Secretary: Full"). A drive has no single batchId of
// its own (its eligibility spans a list of batches), so a Coordinator's
// scope must cover EVERY eligible batch, not merely overlap with one —
// "some overlap" would let a Coordinator scoped to batch-a set a drive's
// eligibility to include an unrelated batch-q they have no assignment to,
// the same class of scope-bypass bug caught and fixed in B2's registration
// search query. An empty eligibleBatchIds list ("open to every batch") is
// therefore never manageable by a Coordinator, only a Secretary.
function isFullyScopedToBatches(actor: AuthenticatedActor, batchIds: readonly string[]): boolean {
  if (batchIds.length === 0) return false;
  const scope = actor.batchScope ?? [];
  return batchIds.every((id) => scope.includes(id));
}

/** Create/update a drive's own fields, and non-publish status transitions (ANNOUNCED→IN_PROGRESS→CLOSED). Never the DRAFT→ANNOUNCED "publish" decision — see canPublishPlacementDrive. */
export function canManagePlacementDrive(actor: AuthenticatedActor, eligibleBatchIds: readonly string[]): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isFullyScopedToBatches(actor, eligibleBatchIds);
  return false;
}

/** The DRAFT→ANNOUNCED transition — the moment a drive becomes visible to students/recruiters. Secretary-only, matching the "no publish" carve-out in the permission matrix (the same approve-vs-review split as profile drafts and registration requests — Q1). */
export function canPublishPlacementDrive(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canApplyToPlacementDrive(actor: AuthenticatedActor): boolean {
  return actor.role === "STUDENT";
}

/** Managing a specific Application (status transitions) is scoped to the applying student's own batch — same shape as canRequestProfileChanges/canReviewRegistrationRequest. */
export function canManageApplication(actor: AuthenticatedActor, targetBatchId: string): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR") return isScopedToBatch(actor, targetBatchId);
  return false;
}

/**
 * V4.0 D5 (§4's permission matrix — "Manage alumni records: Coordinator
 * Full (operational), Secretary Full"). The one entity in this PRD where
 * both roles get byte-for-byte identical, unscoped CRUD authority — no
 * approve/decide split, no batch scoping (alumni aren't tied to an active
 * batch a Coordinator manages).
 */
export function canManageAlumni(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR";
}

/**
 * V4.0 E4 (§13 — "Both T&P Coordinator and Alumni Coordinator have full
 * access, identical to the Secretary... this is a platform-wide capability,
 * not a Secretary-only tool with Coordinator viewing rights"). Same shape as
 * canManageAlumni, for the same reason: no approve/decide split, no batch
 * scoping — Publications aren't tied to a batch a Coordinator manages, and
 * §9 confirms Coordinator Publication Studio access is "full access, same as
 * Secretary."
 */
export function canManagePublications(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR";
}
