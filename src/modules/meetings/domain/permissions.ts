import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { MeetingRecord } from "./entities";

/** Secretary, or a Coordinator delegated `meetings.manage` — no separate create-only key requested (§4.4), mirroring announcements.manage's own single-key shape. */
export function canCreateMeeting(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY") return true;
  return actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "meetings.manage");
}

/** Full management (edit fields, complete/cancel, participants, notes/decisions) — Secretary unscoped, a Coordinator delegated `meetings.manage`, or the meeting's own organizer. */
export function canManageMeeting(actor: AuthenticatedActor, meeting: Pick<MeetingRecord, "organizerId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "meetings.manage")) return true;
  return actor.userId === meeting.organizerId;
}

/**
 * Unlike Events (which become world-visible once PUBLISHED), a Meeting has
 * no public-facing state — only whoever manages it, or a listed participant,
 * may ever see it. `isParticipant` is resolved by the caller (it already
 * needs the participant list for other reasons — see GetMeetingUseCase).
 */
export function canViewMeeting(
  actor: AuthenticatedActor,
  meeting: Pick<MeetingRecord, "organizerId">,
  isParticipant: boolean,
): boolean {
  return canManageMeeting(actor, meeting) || isParticipant;
}
