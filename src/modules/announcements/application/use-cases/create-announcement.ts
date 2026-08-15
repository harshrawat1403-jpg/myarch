import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { AnnouncementAudienceType, AnnouncementPriority, AnnouncementRecord } from "../../domain/entities";
import { isAnnouncementActive } from "../../domain/entities";
import { canCreateAnnouncement } from "../../domain/permissions";
import type { AnnouncementRepository } from "../ports/announcement-repository";
import type { AnnouncementRecipientRepository } from "../ports/announcement-recipient-repository";
import type { AudienceRecipientResolver } from "../ports/audience-recipient-resolver";

export interface CreateAnnouncementInput {
  actor: AuthenticatedActor;
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  audienceType: AnnouncementAudienceType;
  audienceValue?: string | null;
  publishAt?: Date;
  expiresAt?: Date | null;
  /** Only meaningful when audienceType === "SELECTED_GROUP". */
  selectedRecipientUserIds?: string[];
}

/**
 * §4.5 — no separate draft/publish step: `publishAt` (defaults to now) IS
 * the publish mechanism (see domain/entities.ts's isAnnouncementActive).
 * Notifications dispatch synchronously, right here, but ONLY when the
 * announcement is immediately active (publishAt <= now) — a future-dated
 * announcement is created and stored, but nothing notifies until someone
 * views it after its publishAt passes. Wiring a real scheduled-dispatch job
 * for that case is deliberately out of scope this phase (same deferral
 * reasoning as TASK_DEADLINE_APPROACHING's own scheduled-check precedent —
 * a genuinely separate subsystem, not a one-line addition here).
 */
export class CreateAnnouncementUseCase {
  constructor(
    private readonly deps: {
      announcementRepository: AnnouncementRepository;
      announcementRecipientRepository: AnnouncementRecipientRepository;
      audienceRecipientResolver: AudienceRecipientResolver;
      notificationService: NotificationService;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: CreateAnnouncementInput): Promise<AnnouncementRecord> {
    if (!canCreateAnnouncement(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create an announcement");
    }

    const announcement = await this.deps.announcementRepository.create({
      title: input.title.trim(),
      content: input.content.trim(),
      priority: input.priority,
      audienceType: input.audienceType,
      audienceValue: input.audienceValue?.trim() ?? null,
      publishAt: input.publishAt,
      expiresAt: input.expiresAt ?? null,
      authorId: input.actor.userId,
    });

    if (input.audienceType === "SELECTED_GROUP") {
      await this.deps.announcementRecipientRepository.setForAnnouncement(
        announcement.id,
        input.selectedRecipientUserIds ?? [],
      );
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATED,
      targetEntityType: "Announcement",
      targetEntityId: announcement.id,
      metadata: { audienceType: announcement.audienceType },
    });

    if (isAnnouncementActive(announcement)) {
      const recipientUserIds = await this.deps.audienceRecipientResolver.resolveRecipientUserIds(
        announcement.audienceType,
        announcement.audienceValue,
        announcement.id,
      );

      await Promise.all(
        recipientUserIds
          .filter((userId) => userId !== input.actor.userId)
          .map((recipientUserId) =>
            this.deps.notificationService.notify({
              recipientUserId,
              template: "ANNOUNCEMENT_PUBLISHED",
              context: { announcementId: announcement.id, title: announcement.title },
            }),
          ),
      );

      await this.deps.auditRecorder.record({
        actorUserId: input.actor.userId,
        action: AUDIT_ACTIONS.ANNOUNCEMENT_PUBLISHED,
        targetEntityType: "Announcement",
        targetEntityId: announcement.id,
        metadata: { recipientCount: recipientUserIds.length },
      });
    }

    return announcement;
  }
}
