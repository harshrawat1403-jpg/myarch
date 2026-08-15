import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { EventAttachmentKind, EventAttachmentRecord } from "../../domain/entities";
import { canManageEvent } from "../../domain/permissions";
import { EventNotFoundError, InvalidEventAttachmentError } from "../../domain/errors";
import type { EventRepository } from "../ports/event-repository";
import type { EventAttachmentRepository } from "../ports/event-attachment-repository";

const ALLOWED_DOCUMENT_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const ALLOWED_MEDIA_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface AddEventAttachmentInput {
  actor: AuthenticatedActor;
  eventId: string;
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
  kind: EventAttachmentKind;
}

export interface AddEventAttachmentUseCaseDeps {
  eventRepository: EventRepository;
  eventAttachmentRepository: EventAttachmentRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
}

/** §4.2 — "documents" and "media," one table with a kind discriminator (see schema.prisma's EventAttachment doc comment). Whoever manages the event uploads either kind. */
export class AddEventAttachmentUseCase {
  constructor(private readonly deps: AddEventAttachmentUseCaseDeps) {}

  async execute(input: AddEventAttachmentInput): Promise<EventAttachmentRecord> {
    const allowed = input.kind === "MEDIA" ? ALLOWED_MEDIA_MIME_TYPES : ALLOWED_DOCUMENT_MIME_TYPES;
    const extension = allowed[input.mimeType];
    if (!extension) {
      throw new InvalidEventAttachmentError(
        input.kind === "MEDIA" ? "Only JPEG or PNG files are allowed" : "Only PDF or Word documents are allowed",
      );
    }
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidEventAttachmentError("File must be 10MB or smaller");

    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event) throw new EventNotFoundError();
    if (!canManageEvent(input.actor, event)) {
      throw new NotAuthorizedError("Not authorized to attach files to this event");
    }

    const storageKey = `event-attachments/${input.eventId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const attachment = await this.deps.eventAttachmentRepository.add({
      eventId: input.eventId,
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      kind: input.kind,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.EVENT_ATTACHMENT_ADDED,
      targetEntityType: "Event",
      targetEntityId: input.eventId,
      metadata: { kind: input.kind },
    });

    return attachment;
  }
}
