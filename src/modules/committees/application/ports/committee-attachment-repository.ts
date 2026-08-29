import type { CommitteeAttachmentRecord } from "../../domain/entities";

export interface AddCommitteeAttachmentInput {
  committeeId: string;
  ownerUserId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/** Creates the backing FileAsset (classification PUBLIC) and its join row in one step, mirroring announcements'/events' own attachment-repository shape. */
export interface CommitteeAttachmentRepository {
  add(input: AddCommitteeAttachmentInput): Promise<CommitteeAttachmentRecord>;
  listForCommittee(committeeId: string): Promise<CommitteeAttachmentRecord[]>;
  findById(id: string): Promise<(CommitteeAttachmentRecord & { storageKey: string }) | null>;
}
