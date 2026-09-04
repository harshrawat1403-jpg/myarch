import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { FormApplicationReviewerRecord } from "./entities";

export function canSubmitFormApplication(actor: AuthenticatedActor): boolean {
  return actor.role === "STUDENT" && Boolean(actor.studentProfileId);
}

export function canViewApplicationQueue(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY" || (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "applications.view"));
}

export function canAssignReviewer(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canReviewApplication(
  actor: AuthenticatedActor,
  reviewers: readonly FormApplicationReviewerRecord[],
  applicantBatchId: string,
): boolean {
  // Secretaries are the supervisory application authority and intentionally
  // retain review access without assignment. Coordinators require both an
  // explicit active assignment and their existing scoped review permission.
  if (actor.role === "SECRETARY") return true;
  return (
    actor.role === "COORDINATOR" &&
    hasCoordinatorPermission(actor, "applications.review") &&
    (actor.batchScope ?? []).includes(applicantBatchId) &&
    reviewers.some((reviewer) => reviewer.reviewerUserId === actor.userId && !reviewer.unassignedAt)
  );
}

export function canDecideApplication(actor: AuthenticatedActor): boolean {
  return actor.role === "SECRETARY";
}

export function canViewOwnApplication(actor: AuthenticatedActor, applicantUserId: string): boolean {
  return actor.role === "STUDENT" && actor.userId === applicantUserId;
}
