import type { AnnouncementAudienceType } from "../../domain/entities";

/**
 * Resolves the concrete list of userIds an audience actually reaches, used
 * once at creation time to dispatch ANNOUNCEMENT_PUBLISHED notifications
 * (see CreateAnnouncementUseCase). Distinct from isActorInAudience (a pure,
 * per-actor check used for view authorization) — this is the "fan out to
 * everyone who matches" direction, needed only for the notify step.
 * PROGRAM/COMMITTEE/COUNCIL always resolve to an empty list — no backing
 * entity exists yet (see domain/entities.ts's own doc comment).
 */
export interface AudienceRecipientResolver {
  resolveRecipientUserIds(
    audienceType: AnnouncementAudienceType,
    audienceValue: string | null,
    announcementId: string,
  ): Promise<string[]>;
}
