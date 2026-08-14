import type { RequestAttachmentRecord } from "../../domain/entities";

export interface AddRequestAttachmentInput {
  requestId: string;
  ownerUserId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/** Mirrors maintenance's MaintenanceAttachmentRepository exactly. */
export interface RequestAttachmentRepository {
  add(input: AddRequestAttachmentInput): Promise<RequestAttachmentRecord>;
  listForRequest(requestId: string): Promise<RequestAttachmentRecord[]>;
  findById(id: string): Promise<(RequestAttachmentRecord & { storageKey: string }) | null>;
}
