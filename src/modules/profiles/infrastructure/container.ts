import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { notificationService } from "@/modules/notifications";
import { SaveDraftUseCase } from "../application/use-cases/save-draft";
import { SubmitDraftUseCase } from "../application/use-cases/submit-draft";
import { ApproveDraftUseCase } from "../application/use-cases/approve-draft";
import { RequestChangesUseCase } from "../application/use-cases/request-changes";
import { GetDraftUseCase } from "../application/use-cases/get-draft";
import { ListApprovalQueueUseCase } from "../application/use-cases/list-approval-queue";
import { GetPublishedProfileUseCase } from "../application/use-cases/get-published-profile";
import { PrismaProfileDraftRepository } from "./prisma-profile-draft-repository";
import { PrismaPublishedProfileRepository } from "./prisma-published-profile-repository";
import { PrismaStudentLookup } from "./prisma-student-lookup";

// No secrets/config required for this module — safe to construct eagerly.
const profileDraftRepository = new PrismaProfileDraftRepository(prisma);
const publishedProfileRepository = new PrismaPublishedProfileRepository(prisma);
const studentLookup = new PrismaStudentLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const saveDraftUseCase = new SaveDraftUseCase({ profileDraftRepository, studentLookup });
export const submitDraftUseCase = new SubmitDraftUseCase({ profileDraftRepository, auditRecorder });
export const approveDraftUseCase = new ApproveDraftUseCase({
  profileDraftRepository,
  publishedProfileRepository,
  studentLookup,
  auditRecorder,
  notificationService,
});
export const requestChangesUseCase = new RequestChangesUseCase({
  profileDraftRepository,
  studentLookup,
  auditRecorder,
  notificationService,
});
export const getDraftUseCase = new GetDraftUseCase({ profileDraftRepository, studentLookup });
export const listApprovalQueueUseCase = new ListApprovalQueueUseCase({ profileDraftRepository });
export const getPublishedProfileUseCase = new GetPublishedProfileUseCase({
  publishedProfileRepository,
  studentLookup,
});

/** Used by withAuth's getRequiredBatchId callback on single-student routes. */
export async function findStudentBatchId(studentId: string): Promise<string | undefined> {
  const student = await studentLookup.findById(studentId);
  return student?.batchId;
}
