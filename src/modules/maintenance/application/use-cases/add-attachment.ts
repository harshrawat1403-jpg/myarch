import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MaintenanceAttachmentRecord } from "../../domain/entities";
import { canViewMaintenanceIssue } from "../../domain/permissions";
import { InvalidMaintenanceAttachmentError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import type { MaintenanceIssueRepository } from "../ports/maintenance-issue-repository";
import type { MaintenanceAttachmentRepository } from "../ports/maintenance-attachment-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export interface AddMaintenanceAttachmentInput {
  actor: AuthenticatedActor;
  issueId: string;
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface AddMaintenanceAttachmentUseCaseDeps {
  maintenanceIssueRepository: MaintenanceIssueRepository;
  maintenanceAttachmentRepository: MaintenanceAttachmentRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
}

/** §3.2 — photos/attachments. Anyone who can view the issue (the complainant, its assignee, or authorized staff) may add supporting evidence. */
export class AddMaintenanceAttachmentUseCase {
  constructor(private readonly deps: AddMaintenanceAttachmentUseCaseDeps) {}

  async execute(input: AddMaintenanceAttachmentInput): Promise<MaintenanceAttachmentRecord> {
    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) throw new InvalidMaintenanceAttachmentError("Only JPEG, PNG, or PDF files are allowed");
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidMaintenanceAttachmentError("File must be 5MB or smaller");

    const issue = await this.deps.maintenanceIssueRepository.findById(input.issueId);
    if (!issue) throw new MaintenanceIssueNotFoundError();
    if (!canViewMaintenanceIssue(input.actor, issue)) {
      throw new NotAuthorizedError("Not authorized to attach files to this issue");
    }

    const storageKey = `maintenance-attachments/${input.issueId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const attachment = await this.deps.maintenanceAttachmentRepository.add({
      issueId: input.issueId,
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_ATTACHMENT_ADDED,
      targetEntityType: "MaintenanceIssue",
      targetEntityId: input.issueId,
    });

    return attachment;
  }
}
