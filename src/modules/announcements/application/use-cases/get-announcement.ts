import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { AnnouncementAttachmentRecord, AnnouncementRecord } from "../../domain/entities";
import { canViewAnnouncement } from "../../domain/permissions";
import { AnnouncementNotFoundError } from "../../domain/errors";
import type { AnnouncementRepository } from "../ports/announcement-repository";
import type { AnnouncementAttachmentRepository } from "../ports/announcement-attachment-repository";
import type { AnnouncementRecipientRepository } from "../ports/announcement-recipient-repository";
import type { StudentBatchLookup } from "../ports/student-batch-lookup";

export interface GetAnnouncementInput {
  actor: AuthenticatedActor;
  announcementId: string;
}

export interface AnnouncementDetail {
  announcement: AnnouncementRecord;
  attachments: AnnouncementAttachmentRecord[];
}

export class GetAnnouncementUseCase {
  constructor(
    private readonly deps: {
      announcementRepository: AnnouncementRepository;
      announcementAttachmentRepository: AnnouncementAttachmentRepository;
      announcementRecipientRepository: AnnouncementRecipientRepository;
      studentBatchLookup: StudentBatchLookup;
    },
  ) {}

  async execute(input: GetAnnouncementInput): Promise<AnnouncementDetail> {
    const announcement = await this.deps.announcementRepository.findById(input.announcementId);
    if (!announcement) throw new AnnouncementNotFoundError();

    const [batchId, isSelectedRecipient] = await Promise.all([
      this.deps.studentBatchLookup.findBatchIdByUserId(input.actor.userId),
      this.deps.announcementRecipientRepository.isRecipient(announcement.id, input.actor.userId),
    ]);

    if (!canViewAnnouncement(input.actor, announcement, { batchId, isSelectedRecipient })) {
      throw new NotAuthorizedError("Not authorized to view this announcement");
    }

    const attachments = await this.deps.announcementAttachmentRepository.listForAnnouncement(announcement.id);
    return { announcement, attachments };
  }
}
