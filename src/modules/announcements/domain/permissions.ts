import type { AuthenticatedActor } from "@/modules/auth";
import { hasCoordinatorPermission } from "@/modules/coordinators";
import type { AnnouncementRecord } from "./entities";
import { isActorInAudience, isAnnouncementActive } from "./entities";

/** Secretary, or a Coordinator delegated `announcements.manage`. */
export function canCreateAnnouncement(actor: AuthenticatedActor): boolean {
  if (actor.role === "SECRETARY") return true;
  return actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "announcements.manage");
}

/** Full management (edit, delete, attachments) — Secretary unscoped, a Coordinator delegated `announcements.manage`, or the announcement's own author. */
export function canManageAnnouncement(actor: AuthenticatedActor, announcement: Pick<AnnouncementRecord, "authorId">): boolean {
  if (actor.role === "SECRETARY") return true;
  if (actor.role === "COORDINATOR" && hasCoordinatorPermission(actor, "announcements.manage")) return true;
  return actor.userId === announcement.authorId;
}

/** Whoever manages it can always see it (including before publishAt/after expiresAt, for editing); everyone else only while it's active AND they're in its resolved audience. */
export function canViewAnnouncement(
  actor: AuthenticatedActor,
  announcement: Pick<AnnouncementRecord, "authorId" | "audienceType" | "audienceValue" | "publishAt" | "expiresAt">,
  audienceContext: {
    batchId: string | null;
    isSelectedRecipient: boolean;
    committeeIds: readonly string[];
    isCouncilMember: boolean;
  },
): boolean {
  if (canManageAnnouncement(actor, announcement)) return true;
  return isAnnouncementActive(announcement) && isActorInAudience(actor, announcement, audienceContext);
}
