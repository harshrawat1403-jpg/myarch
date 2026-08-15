import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { EventRecord } from "./entities";

/** Secretary, or a Coordinator delegated `events.create`/`events.manage` — Students/Recruiters/Alumni attend events, they don't originate them. */
export function canCreateEvent(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY") return true;
  return actor.role === "COORDINATOR" && (hasCoordinatorPermission(actor, "events.create") || hasCoordinatorPermission(actor, "events.manage"));
}

/**
 * A DRAFT event is only visible to the Secretary, its organizer, and a
 * Coordinator delegated `events.view`/`events.manage` — everyone else only
 * ever sees an event once it is at least PUBLISHED (also covers COMPLETED/
 * CANCELLED, so a past or called-off event stays visible/explained rather
 * than silently vanishing).
 */
export function canViewEvent(actor: AuthenticatedActor, event: Pick<EventRecord, "organizerId" | "status">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.userId === event.organizerId) return true;
  if (actor.role === "COORDINATOR" && (hasCoordinatorPermission(actor, "events.view") || hasCoordinatorPermission(actor, "events.manage"))) {
    return true;
  }
  return event.status !== "DRAFT";
}

/** Full management (edit fields, publish/complete/cancel, participants, checklist, attachments) — Secretary unscoped, a Coordinator delegated `events.manage`, or the event's own organizer. */
export function canManageEvent(actor: AuthenticatedActor, event: Pick<EventRecord, "organizerId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "events.manage")) return true;
  return actor.userId === event.organizerId;
}

/**
 * Self-registration — Student and Alumni are the department's own community
 * attending its events; Recruiter is an external party events aren't
 * addressed to, and Secretary/Coordinator organize/manage rather than
 * self-register.
 */
export function canRegisterForEvent(actor: AuthenticatedActor): boolean {
  return actor.role === "STUDENT" || actor.role === "ALUMNI";
}
