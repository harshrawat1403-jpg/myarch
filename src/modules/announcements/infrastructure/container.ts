/** Composition root for the announcements module (MYARCH Phase 3, §4.5). */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { notificationService } from "@/modules/notifications";
import { calendarSourceRegistry } from "@/modules/calendar";
import { PrismaAnnouncementRepository } from "./prisma-announcement-repository";
import { PrismaAnnouncementAttachmentRepository } from "./prisma-announcement-attachment-repository";
import { PrismaAnnouncementRecipientRepository } from "./prisma-announcement-recipient-repository";
import { PrismaStudentBatchLookup } from "./prisma-student-batch-lookup";
import { PrismaAudienceRecipientResolver } from "./prisma-audience-recipient-resolver";
import { AnnouncementCalendarSource } from "./announcement-calendar-source";
import { CreateAnnouncementUseCase } from "../application/use-cases/create-announcement";
import { UpdateAnnouncementUseCase } from "../application/use-cases/update-announcement";
import { DeleteAnnouncementUseCase } from "../application/use-cases/delete-announcement";
import { GetAnnouncementUseCase } from "../application/use-cases/get-announcement";
import { SearchAnnouncementsUseCase } from "../application/use-cases/search-announcements";
import { AddAnnouncementAttachmentUseCase } from "../application/use-cases/add-attachment";

const announcementRepository = new PrismaAnnouncementRepository(prisma);
export const announcementAttachmentRepository = new PrismaAnnouncementAttachmentRepository(prisma);
const announcementRecipientRepository = new PrismaAnnouncementRecipientRepository(prisma);
const studentBatchLookup = new PrismaStudentBatchLookup(prisma);
const audienceRecipientResolver = new PrismaAudienceRecipientResolver(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

calendarSourceRegistry.register(new AnnouncementCalendarSource({ announcementRepository, studentBatchLookup }));

export const createAnnouncementUseCase = new CreateAnnouncementUseCase({
  announcementRepository,
  announcementRecipientRepository,
  audienceRecipientResolver,
  notificationService,
  auditRecorder,
});
export const updateAnnouncementUseCase = new UpdateAnnouncementUseCase({
  announcementRepository,
  announcementRecipientRepository,
  auditRecorder,
});
export const deleteAnnouncementUseCase = new DeleteAnnouncementUseCase({ announcementRepository, auditRecorder });
export const getAnnouncementUseCase = new GetAnnouncementUseCase({
  announcementRepository,
  announcementAttachmentRepository,
  announcementRecipientRepository,
  studentBatchLookup,
});
export const searchAnnouncementsUseCase = new SearchAnnouncementsUseCase({ announcementRepository, studentBatchLookup });
export const addAnnouncementAttachmentUseCase = new AddAnnouncementAttachmentUseCase({
  announcementRepository,
  announcementAttachmentRepository,
  auditRecorder,
  saveFile,
});
