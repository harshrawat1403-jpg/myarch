import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { AnnouncementAttachmentRecord } from "../../domain/entities";
import { canManageAnnouncement } from "../../domain/permissions";
import { AnnouncementNotFoundError, InvalidAnnouncementAttachmentError } from "../../domain/errors";
import type { AnnouncementRepository } from "../ports/announcement-repository";
import type { AnnouncementAttachmentRepository } from "../ports/announcement-attachment-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface AddAnnouncementAttachmentInput {
  actor: AuthenticatedActor;
  announcementId: string;
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface AddAnnouncementAttachmentUseCaseDeps {
  announcementRepository: AnnouncementRepository;
  announcementAttachmentRepository: AnnouncementAttachmentRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
}

export class AddAnnouncementAttachmentUseCase {
  constructor(private readonly deps: AddAnnouncementAttachmentUseCaseDeps) {}

  async execute(input: AddAnnouncementAttachmentInput): Promise<AnnouncementAttachmentRecord> {
    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) throw new InvalidAnnouncementAttachmentError("Only PDF, JPEG, or PNG files are allowed");
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidAnnouncementAttachmentError("File must be 10MB or smaller");

    const announcement = await this.deps.announcementRepository.findById(input.announcementId);
    if (!announcement) throw new AnnouncementNotFoundError();
    if (!canManageAnnouncement(input.actor, announcement)) {
      throw new NotAuthorizedError("Not authorized to attach files to this announcement");
    }

    const storageKey = `announcement-attachments/${input.announcementId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const attachment = await this.deps.announcementAttachmentRepository.add({
      announcementId: input.announcementId,
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_ATTACHMENT_ADDED,
      targetEntityType: "Announcement",
      targetEntityId: input.announcementId,
    });

    return attachment;
  }
}
