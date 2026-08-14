/**
 * Composition root for the Generic Request module (MYARCH Phase 2, §3.7).
 * No secrets involved beyond the shared file-storage root — safe to
 * construct eagerly, mirroring maintenance's own container shape.
 */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { notificationService } from "@/modules/notifications";
import { PrismaRequestRepository } from "./prisma-request-repository";
import { PrismaRequestAttachmentRepository } from "./prisma-request-attachment-repository";
import { PrismaUserRoleLookup } from "./prisma-user-role-lookup";
import { PrismaSecretaryRecipientLookup } from "./prisma-secretary-recipient-lookup";
import { SubmitRequestUseCase } from "../application/use-cases/submit-request";
import { StartRequestReviewUseCase } from "../application/use-cases/start-review";
import { DecideRequestUseCase } from "../application/use-cases/decide-request";
import { AssignRequestUseCase } from "../application/use-cases/assign-request";
import { ReassignRequestUseCase } from "../application/use-cases/reassign-request";
import { UpdateRequestUseCase } from "../application/use-cases/update-request";
import { StartRequestProgressUseCase } from "../application/use-cases/start-progress";
import { CompleteRequestUseCase } from "../application/use-cases/complete-request";
import { CloseRequestUseCase } from "../application/use-cases/close-request";
import { AddRequestAttachmentUseCase } from "../application/use-cases/add-attachment";
import { AddRequestUpdateUseCase } from "../application/use-cases/add-update";
import { GetRequestUseCase } from "../application/use-cases/get-request";
import { SearchRequestsUseCase } from "../application/use-cases/search-requests";

const requestRepository = new PrismaRequestRepository(prisma);
export const requestAttachmentRepository = new PrismaRequestAttachmentRepository(prisma);
const userRoleLookup = new PrismaUserRoleLookup(prisma);
const secretaryRecipientLookup = new PrismaSecretaryRecipientLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const submitRequestUseCase = new SubmitRequestUseCase({
  requestRepository,
  secretaryRecipientLookup,
  notificationService,
  auditRecorder,
});
export const startRequestReviewUseCase = new StartRequestReviewUseCase({ requestRepository, auditRecorder });
export const decideRequestUseCase = new DecideRequestUseCase({ requestRepository, notificationService, auditRecorder });
export const assignRequestUseCase = new AssignRequestUseCase({ requestRepository, userRoleLookup, auditRecorder });
export const reassignRequestUseCase = new ReassignRequestUseCase({ requestRepository, userRoleLookup, auditRecorder });
export const updateRequestUseCase = new UpdateRequestUseCase({ requestRepository, auditRecorder });
export const startRequestProgressUseCase = new StartRequestProgressUseCase({ requestRepository, auditRecorder });
export const completeRequestUseCase = new CompleteRequestUseCase({ requestRepository, auditRecorder });
export const closeRequestUseCase = new CloseRequestUseCase({ requestRepository, auditRecorder });
export const addRequestAttachmentUseCase = new AddRequestAttachmentUseCase({
  requestRepository,
  requestAttachmentRepository,
  auditRecorder,
  saveFile,
});
export const addRequestUpdateUseCase = new AddRequestUpdateUseCase({ requestRepository });
export const getRequestUseCase = new GetRequestUseCase({ requestRepository, requestAttachmentRepository });
export const searchRequestsUseCase = new SearchRequestsUseCase({ requestRepository });
