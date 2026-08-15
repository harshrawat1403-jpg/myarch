import type { AnnouncementAttachmentRecord } from "../../domain/entities";

export interface AddAnnouncementAttachmentInput {
  announcementId: string;
  ownerUserId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/** Creates the backing FileAsset (classification PUBLIC) and its join row in one step, mirroring events'/maintenance's own attachment-repository shape. */
export interface AnnouncementAttachmentRepository {
  add(input: AddAnnouncementAttachmentInput): Promise<AnnouncementAttachmentRecord>;
  listForAnnouncement(announcementId: string): Promise<AnnouncementAttachmentRecord[]>;
  findById(id: string): Promise<(AnnouncementAttachmentRecord & { storageKey: string }) | null>;
}
