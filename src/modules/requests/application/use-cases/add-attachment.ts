import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RequestAttachmentRecord } from "../../domain/entities";
import { canViewRequest } from "../../domain/permissions";
import { InvalidRequestAttachmentError, RequestNotFoundError } from "../../domain/errors";
import type { RequestRepository } from "../ports/request-repository";
import type { RequestAttachmentRepository } from "../ports/request-attachment-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export interface AddRequestAttachmentInput {
  actor: AuthenticatedActor;
  requestId: string;
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface AddRequestAttachmentUseCaseDeps {
  requestRepository: RequestRepository;
  requestAttachmentRepository: RequestAttachmentRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
}

/** §3.7 — attachments. Mirrors AddMaintenanceAttachmentUseCase exactly. */
export class AddRequestAttachmentUseCase {
  constructor(private readonly deps: AddRequestAttachmentUseCaseDeps) {}

  async execute(input: AddRequestAttachmentInput): Promise<RequestAttachmentRecord> {
    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) throw new InvalidRequestAttachmentError("Only JPEG, PNG, or PDF files are allowed");
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidRequestAttachmentError("File must be 5MB or smaller");

    const request = await this.deps.requestRepository.findById(input.requestId);
    if (!request) throw new RequestNotFoundError();
    if (!canViewRequest(input.actor, request)) {
      throw new NotAuthorizedError("Not authorized to attach files to this request");
    }

    const storageKey = `request-attachments/${input.requestId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const attachment = await this.deps.requestAttachmentRepository.add({
      requestId: input.requestId,
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REQUEST_ATTACHMENT_ADDED,
      targetEntityType: "Request",
      targetEntityId: input.requestId,
    });

    return attachment;
  }
}
