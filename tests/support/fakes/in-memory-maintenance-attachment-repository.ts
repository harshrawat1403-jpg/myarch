import crypto from "node:crypto";
import type { MaintenanceAttachmentRecord } from "../../../src/modules/maintenance";
import type {
  AddMaintenanceAttachmentInput,
  MaintenanceAttachmentRepository,
} from "../../../src/modules/maintenance/application/ports/maintenance-attachment-repository";

export class InMemoryMaintenanceAttachmentRepository implements MaintenanceAttachmentRepository {
  private readonly attachments: (MaintenanceAttachmentRecord & { storageKey: string })[] = [];

  async add(input: AddMaintenanceAttachmentInput): Promise<MaintenanceAttachmentRecord> {
    const attachment = {
      id: crypto.randomUUID(),
      issueId: input.issueId,
      fileId: crypto.randomUUID(),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      createdAt: new Date(),
      storageKey: input.storageKey,
    };
    this.attachments.push(attachment);
    return attachment;
  }

  async listForIssue(issueId: string): Promise<MaintenanceAttachmentRecord[]> {
    return this.attachments.filter((a) => a.issueId === issueId);
  }

  async findById(id: string): Promise<(MaintenanceAttachmentRecord & { storageKey: string }) | null> {
    return this.attachments.find((a) => a.id === id) ?? null;
  }
}
