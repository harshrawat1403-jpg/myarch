import type { AuthenticatedActor } from "@/modules/auth";

/**
 * Compatibility bridge for the side-by-side platform. Existing roles remain
 * the source of identity; these named capabilities are the only authority
 * vocabulary the new modules use.
 */
export type PlatformCapability =
  | "talent.edit-own"
  | "talent.feature"
  | "recruitment.manage"
  | "recruitment.publish"
  | "recruitment.manage-company"
  | "recruitment.view-applicant"
  | "recruitment.record-outcome"
  | "alumni.edit-own"
  | "alumni.manage"
  | "alumni.approve";

const LEGACY_TNP_COORDINATOR_PERMISSIONS = new Set([
  "applications.view",
  "applications.review",
  "applications.shortlist",
  "interviews.manage",
]);

function isTnpCoordinator(actor: AuthenticatedActor): boolean {
  return actor.role === "COORDINATOR" && (actor.permissions ?? []).some((permission) => LEGACY_TNP_COORDINATOR_PERMISSIONS.has(permission));
}

function isPlatformAdministrator(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canEditOwnTalentProfile(actor: AuthenticatedActor, studentProfileId: string): boolean {
  return actor.role === "STUDENT" && actor.studentProfileId === studentProfileId;
}

export function canFeatureTalent(actor: AuthenticatedActor): boolean {
  return isPlatformAdministrator(actor);
}

export function canViewPublishedTalent(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || actor.role === "COORDINATOR" || actor.role === "STUDENT" || actor.role === "RECRUITER" || actor.role === "ALUMNI";
}

export function canManageRecruitment(actor: AuthenticatedActor): boolean {
  return isPlatformAdministrator(actor) || isTnpCoordinator(actor);
}

export function canPublishRecruitmentOpportunity(actor: AuthenticatedActor): boolean {
  return canManageRecruitment(actor);
}

export function canManageCompany(
  actor: AuthenticatedActor,
  membership: { companyId: string; role: "OWNER" | "RECRUITER" } | null,
): boolean {
  return canManageRecruitment(actor) || (actor.role === "RECRUITER" && membership?.role === "OWNER");
}

export function canEditOpportunityDraft(
  actor: AuthenticatedActor,
  membership: { companyId: string; role: "OWNER" | "RECRUITER" } | null,
): boolean {
  return canManageRecruitment(actor) || (actor.role === "RECRUITER" && membership !== null);
}

export function canViewApplicant(
  actor: AuthenticatedActor,
  membership: { companyId: string; role: "OWNER" | "RECRUITER" } | null,
): boolean {
  return canManageRecruitment(actor) || (actor.role === "RECRUITER" && membership !== null);
}

export function canRecordPlacementOutcome(actor: AuthenticatedActor): boolean {
  return canManageRecruitment(actor);
}

export function canEditOwnAlumniProfile(actor: AuthenticatedActor, profileUserId: string | null): boolean {
  return actor.role === "ALUMNI" && profileUserId === actor.userId;
}

export function canManageAlumni(actor: AuthenticatedActor): boolean {
  return isPlatformAdministrator(actor) || isTnpCoordinator(actor);
}

export function canApproveAlumni(actor: AuthenticatedActor): boolean {
  return isPlatformAdministrator(actor);
}

export function hasPlatformCapability(
  actor: AuthenticatedActor,
  capability: PlatformCapability,
  context: { studentProfileId?: string; alumniProfileUserId?: string | null; membership?: { companyId: string; role: "OWNER" | "RECRUITER" } | null } = {},
): boolean {
  switch (capability) {
    case "talent.edit-own":
      return Boolean(context.studentProfileId && canEditOwnTalentProfile(actor, context.studentProfileId));
    case "talent.feature":
      return canFeatureTalent(actor);
    case "recruitment.manage":
    case "recruitment.publish":
    case "recruitment.record-outcome":
      return canManageRecruitment(actor);
    case "recruitment.manage-company":
      return canManageCompany(actor, context.membership ?? null);
    case "recruitment.view-applicant":
      return canViewApplicant(actor, context.membership ?? null);
    case "alumni.edit-own":
      return canEditOwnAlumniProfile(actor, context.alumniProfileUserId ?? null);
    case "alumni.manage":
      return canManageAlumni(actor);
    case "alumni.approve":
      return canApproveAlumni(actor);
  }
}
