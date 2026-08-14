import crypto from "node:crypto";
import type { RequestAttachmentRecord } from "../../../src/modules/requests";
import type {
  AddRequestAttachmentInput,
  RequestAttachmentRepository,
} from "../../../src/modules/requests/application/ports/request-attachment-repository";

export class InMemoryRequestAttachmentRepository implements RequestAttachmentRepository {
  private readonly attachments: (RequestAttachmentRecord & { storageKey: string })[] = [];

  async add(input: AddRequestAttachmentInput): Promise<RequestAttachmentRecord> {
    const attachment = {
      id: crypto.randomUUID(),
      requestId: input.requestId,
      fileId: crypto.randomUUID(),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      createdAt: new Date(),
      storageKey: input.storageKey,
    };
    this.attachments.push(attachment);
    return attachment;
  }

  async listForRequest(requestId: string): Promise<RequestAttachmentRecord[]> {
    return this.attachments.filter((a) => a.requestId === requestId);
  }

  async findById(id: string): Promise<(RequestAttachmentRecord & { storageKey: string }) | null> {
    return this.attachments.find((a) => a.id === id) ?? null;
  }
}
