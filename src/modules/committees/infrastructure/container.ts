/** Composition root for the committees module (MYARCH Phase 4, §5). */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { notificationService } from "@/modules/notifications";
import { PrismaCommitteeRepository } from "./prisma-committee-repository";
import { PrismaCommitteeMembershipRepository } from "./prisma-committee-membership-repository";
import { PrismaCommitteeAttachmentRepository } from "./prisma-committee-attachment-repository";
import { CreateCommitteeUseCase } from "../application/use-cases/create-committee";
import { UpdateCommitteeUseCase } from "../application/use-cases/update-committee";
import { ArchiveCommitteeUseCase } from "../application/use-cases/archive-committee";
import { GetCommitteeUseCase } from "../application/use-cases/get-committee";
import { SearchCommitteesUseCase } from "../application/use-cases/search-committees";
import { AddCommitteeMemberUseCase } from "../application/use-cases/add-committee-member";
import { UpdateCommitteeMemberUseCase } from "../application/use-cases/update-committee-member";
import { EndCommitteeMembershipUseCase } from "../application/use-cases/end-committee-membership";
import { AddCommitteeAttachmentUseCase } from "../application/use-cases/add-committee-attachment";

const committeeRepository = new PrismaCommitteeRepository(prisma);
const committeeMembershipRepository = new PrismaCommitteeMembershipRepository(prisma);
export const committeeAttachmentRepository = new PrismaCommitteeAttachmentRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

// No CommitteeCalendarSource is registered — a committee's own dated
// activity (meetings via Meeting.committeeId, action items via Task's
// relatedEntityType "Committee") already surfaces through the existing
// MeetingCalendarSource/TaskCalendarSource once linked; committees have no
// dated occurrence of their own beyond those. See calendar's own
// GetCalendarEntriesUseCase "committee" filter, wired in this phase to match
// against those two sources' relatedEntityId/committeeId instead.

export const createCommitteeUseCase = new CreateCommitteeUseCase({ committeeRepository, auditRecorder });
export const updateCommitteeUseCase = new UpdateCommitteeUseCase({
  committeeRepository,
  committeeMembershipRepository,
  auditRecorder,
});
export const archiveCommitteeUseCase = new ArchiveCommitteeUseCase({
  committeeRepository,
  committeeMembershipRepository,
  auditRecorder,
});
export const getCommitteeUseCase = new GetCommitteeUseCase({
  committeeRepository,
  committeeMembershipRepository,
  committeeAttachmentRepository,
});
export const searchCommitteesUseCase = new SearchCommitteesUseCase({ committeeRepository });
export const addCommitteeMemberUseCase = new AddCommitteeMemberUseCase({
  committeeRepository,
  committeeMembershipRepository,
  auditRecorder,
  notificationService,
});
export const updateCommitteeMemberUseCase = new UpdateCommitteeMemberUseCase({
  committeeRepository,
  committeeMembershipRepository,
  auditRecorder,
});
export const endCommitteeMembershipUseCase = new EndCommitteeMembershipUseCase({
  committeeRepository,
  committeeMembershipRepository,
  auditRecorder,
});
export const addCommitteeAttachmentUseCase = new AddCommitteeAttachmentUseCase({
  committeeRepository,
  committeeMembershipRepository,
  committeeAttachmentRepository,
  auditRecorder,
  saveFile,
});
