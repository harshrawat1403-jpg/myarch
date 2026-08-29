import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { CommitteeMembershipRecord } from "./entities";
import { isCommitteeLead } from "./entities";

/** Secretary, or a Coordinator delegated `committees.manage` — mirrors canCreateMeeting's own single-key shape. */
export function canCreateCommittee(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY") return true;
  return actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "committees.manage");
}

/**
 * Full management (edit fields, archive, members, attachments) — Secretary
 * unscoped, a Coordinator delegated `committees.manage`, or any user holding
 * an active, isLead=true membership on THIS committee. Unlike Meeting's
 * single organizerId, a committee can have multiple co-leads (e.g. President
 * and Secretary both need control), hence the structured isLead flag rather
 * than a single-owner column.
 */
export function canManageCommittee(
  actor: AuthenticatedActor,
  memberships: readonly Pick<CommitteeMembershipRecord, "userId" | "isActive" | "isLead">[],
): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "committees.manage")) return true;
  return isCommitteeLead(actor.userId, memberships);
}

/**
 * Broadly readable — mirrors a Published Event's "visible to everyone"
 * precedent. Committees are a governance-transparency feature (who holds
 * what position), not confidential data; only RECRUITER (an external,
 * company-facing role) is excluded, matching EVERYONE-audience Announcements'
 * own RECRUITER exclusion.
 */
export function canViewCommittee(actor: AuthenticatedActor): boolean {
  return actor.role !== "RECRUITER";
}
