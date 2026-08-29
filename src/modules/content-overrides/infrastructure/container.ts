/** Composition root for the content-overrides module (MYARCH Edit Mode). */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { PrismaContentOverrideRepository } from "./prisma-content-override-repository";
import { PrismaContentOverrideFileRepository } from "./prisma-content-override-file-repository";
import { GetPageContentOverridesUseCase } from "../application/use-cases/get-page-content-overrides";
import { GetPageDraftContentOverridesUseCase } from "../application/use-cases/get-page-draft-content-overrides";
import { GetDraftSummaryUseCase } from "../application/use-cases/get-draft-summary";
import { SaveContentOverrideUseCase } from "../application/use-cases/save-content-override";
import { RemoveContentOverrideUseCase } from "../application/use-cases/remove-content-override";
import { PublishDraftContentOverridesUseCase } from "../application/use-cases/publish-draft-content-overrides";
import { DiscardDraftContentOverridesUseCase } from "../application/use-cases/discard-draft-content-overrides";
import { UploadContentOverrideImageUseCase } from "../application/use-cases/upload-content-override-image";

export const contentOverrideRepository = new PrismaContentOverrideRepository(prisma);
export const contentOverrideFileRepository = new PrismaContentOverrideFileRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const getPageContentOverridesUseCase = new GetPageContentOverridesUseCase({ contentOverrideRepository });
export const getPageDraftContentOverridesUseCase = new GetPageDraftContentOverridesUseCase({ contentOverrideRepository });
export const getDraftSummaryUseCase = new GetDraftSummaryUseCase({ contentOverrideRepository });
export const saveContentOverrideUseCase = new SaveContentOverrideUseCase({ contentOverrideRepository, auditRecorder });
export const removeContentOverrideUseCase = new RemoveContentOverrideUseCase({ contentOverrideRepository, auditRecorder });
export const publishDraftContentOverridesUseCase = new PublishDraftContentOverridesUseCase({ contentOverrideRepository, auditRecorder });
export const discardDraftContentOverridesUseCase = new DiscardDraftContentOverridesUseCase({ contentOverrideRepository, auditRecorder });
export const uploadContentOverrideImageUseCase = new UploadContentOverrideImageUseCase({ fileRepository: contentOverrideFileRepository, saveFile });
