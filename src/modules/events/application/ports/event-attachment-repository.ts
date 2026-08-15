import type { EventAttachmentKind, EventAttachmentRecord } from "../../domain/entities";

export interface AddEventAttachmentInput {
  eventId: string;
  ownerUserId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  kind: EventAttachmentKind;
}

/** Creates the backing FileAsset (classification PUBLIC — event documents/media are department-visible) and its join row in one step, mirroring maintenance's own attachment-repository shape. */
export interface EventAttachmentRepository {
  add(input: AddEventAttachmentInput): Promise<EventAttachmentRecord>;
  listForEvent(eventId: string): Promise<EventAttachmentRecord[]>;
  findById(id: string): Promise<(EventAttachmentRecord & { storageKey: string }) | null>;
}
