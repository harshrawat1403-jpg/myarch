import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageAnnouncement } from "../../domain/permissions";
import { AnnouncementNotFoundError } from "../../domain/errors";
import type { AnnouncementRepository } from "../ports/announcement-repository";

export interface DeleteAnnouncementInput {
  actor: AuthenticatedActor;
  announcementId: string;
}

/** A hard delete, not a status change (there is no status column) — for retracting a mistaken announcement. Already-sent notifications are not recalled. */
export class DeleteAnnouncementUseCase {
  constructor(private readonly deps: { announcementRepository: AnnouncementRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: DeleteAnnouncementInput): Promise<void> {
    const existing = await this.deps.announcementRepository.findById(input.announcementId);
    if (!existing) throw new AnnouncementNotFoundError();
    if (!canManageAnnouncement(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to delete this announcement");
    }

    await this.deps.announcementRepository.delete(input.announcementId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETED,
      targetEntityType: "Announcement",
      targetEntityId: input.announcementId,
    });
  }
}
