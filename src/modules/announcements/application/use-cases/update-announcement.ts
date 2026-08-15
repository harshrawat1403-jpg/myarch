import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { AnnouncementRecord } from "../../domain/entities";
import { canManageAnnouncement } from "../../domain/permissions";
import { AnnouncementNotFoundError } from "../../domain/errors";
import type { AnnouncementRepository, UpdateAnnouncementData } from "../ports/announcement-repository";
import type { AnnouncementRecipientRepository } from "../ports/announcement-recipient-repository";

export interface UpdateAnnouncementInput extends UpdateAnnouncementData {
  actor: AuthenticatedActor;
  announcementId: string;
  /** Only applied when audienceType is being changed to (or already is) SELECTED_GROUP. */
  selectedRecipientUserIds?: string[];
}

/** No re-notification on edit — ANNOUNCEMENT_PUBLISHED fires once, at creation time (see CreateAnnouncementUseCase). A correction to an already-published announcement is visible in place; it doesn't re-broadcast. */
export class UpdateAnnouncementUseCase {
  constructor(
    private readonly deps: {
      announcementRepository: AnnouncementRepository;
      announcementRecipientRepository: AnnouncementRecipientRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: UpdateAnnouncementInput): Promise<AnnouncementRecord> {
    const existing = await this.deps.announcementRepository.findById(input.announcementId);
    if (!existing) throw new AnnouncementNotFoundError();
    if (!canManageAnnouncement(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this announcement");
    }

    const { actor: _actor, announcementId: _id, selectedRecipientUserIds, ...data } = input;
    const updated = await this.deps.announcementRepository.update(input.announcementId, {
      ...data,
      title: data.title?.trim(),
      content: data.content?.trim(),
      audienceValue: data.audienceValue !== undefined ? data.audienceValue?.trim() ?? null : undefined,
    });

    if (updated.audienceType === "SELECTED_GROUP" && selectedRecipientUserIds) {
      await this.deps.announcementRecipientRepository.setForAnnouncement(updated.id, selectedRecipientUserIds);
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_UPDATED,
      targetEntityType: "Announcement",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
