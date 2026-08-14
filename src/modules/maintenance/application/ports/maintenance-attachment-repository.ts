import type { MaintenanceAttachmentRecord } from "../../domain/entities";

export interface AddMaintenanceAttachmentInput {
  issueId: string;
  ownerUserId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/** Creates the backing FileAsset (classification PUBLIC — a photo of a broken fixture is department-visible, never confidential) and its join row in one step. Mirrors placements' CertificateFileRepository's "own narrow port, not a shared generic FileAsset interface" shape. */
export interface MaintenanceAttachmentRepository {
  add(input: AddMaintenanceAttachmentInput): Promise<MaintenanceAttachmentRecord>;
  listForIssue(issueId: string): Promise<MaintenanceAttachmentRecord[]>;
  findById(id: string): Promise<(MaintenanceAttachmentRecord & { storageKey: string }) | null>;
}
