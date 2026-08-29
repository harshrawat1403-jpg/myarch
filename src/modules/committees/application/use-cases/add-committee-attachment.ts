import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CommitteeAttachmentRecord } from "../../domain/entities";
import { canManageCommittee } from "../../domain/permissions";
import { CommitteeNotFoundError, InvalidCommitteeAttachmentError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";
import type { CommitteeAttachmentRepository } from "../ports/committee-attachment-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface AddCommitteeAttachmentInput {
  actor: AuthenticatedActor;
  committeeId: string;
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface AddCommitteeAttachmentUseCaseDeps {
  committeeRepository: CommitteeRepository;
  committeeMembershipRepository: CommitteeMembershipRepository;
  committeeAttachmentRepository: CommitteeAttachmentRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
}

/** Documents reuse the existing flat FileAsset(PUBLIC) join-table pattern, same as Events/Announcements/Maintenance — not Phase 7's generic versioned Resource/Document system. */
export class AddCommitteeAttachmentUseCase {
  constructor(private readonly deps: AddCommitteeAttachmentUseCaseDeps) {}

  async execute(input: AddCommitteeAttachmentInput): Promise<CommitteeAttachmentRecord> {
    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) throw new InvalidCommitteeAttachmentError("Only PDF, JPEG, or PNG files are allowed");
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidCommitteeAttachmentError("File must be 10MB or smaller");

    const committee = await this.deps.committeeRepository.findById(input.committeeId);
    if (!committee) throw new CommitteeNotFoundError();

    const memberships = await this.deps.committeeMembershipRepository.listForCommittee(input.committeeId);
    if (!canManageCommittee(input.actor, memberships)) {
      throw new NotAuthorizedError("Not authorized to attach files to this committee");
    }

    const storageKey = `committee-attachments/${input.committeeId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const attachment = await this.deps.committeeAttachmentRepository.add({
      committeeId: input.committeeId,
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_ATTACHMENT_ADDED,
      targetEntityType: "Committee",
      targetEntityId: input.committeeId,
    });

    return attachment;
  }
}
