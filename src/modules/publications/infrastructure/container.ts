/**
 * Composition root for the publications module — see notifications'
 * container.ts for the exact split this mirrors: cheap, secret-free
 * dependencies constructed eagerly here. The job handler is deliberately
 * NOT imported by this file at all (not even the class import) — see
 * register-job-handlers.ts's own doc comment for why: importing
 * PublicationExportJobHandler transitively pulls in Playwright/pptxgenjs/
 * react-dom/server, and since every route handler in this module imports
 * *this* file for its use-case singletons, that import would put a
 * Node-only, Next.js-flagged dependency graph into every route's bundle,
 * not just the job worker's.
 */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { jobDispatcher } from "@/modules/jobs";
import { PrismaPublicationRepository } from "./prisma-publication-repository";
import { PrismaPublicationTemplateRepository } from "./prisma-publication-template-repository";
import { PrismaPublicationVersionRepository } from "./prisma-publication-version-repository";
import { PrismaPublicationExportRepository } from "./prisma-publication-export-repository";
import { PrismaPublicationDataLookup } from "./prisma-publication-data-lookup";
import { PrismaPublicationImageFileRepository } from "./prisma-publication-image-file-repository";
import { PrismaPublicationExportFileRepository } from "./prisma-publication-export-file-repository";

import { GetPreviewDataUseCase } from "../application/use-cases/get-preview-data";
import { ListPublicationTemplatesUseCase } from "../application/use-cases/list-publication-templates";
import { GetPublicationTemplateUseCase } from "../application/use-cases/get-publication-template";
import { ListSelectableDataUseCase } from "../application/use-cases/list-selectable-data";
import { CreatePublicationUseCase } from "../application/use-cases/create-publication";
import { UpdatePublicationUseCase } from "../application/use-cases/update-publication";
import { GetPublicationUseCase } from "../application/use-cases/get-publication";
import { SearchPublicationsUseCase } from "../application/use-cases/search-publications";
import { DeletePublicationUseCase } from "../application/use-cases/delete-publication";
import { PublishPublicationUseCase } from "../application/use-cases/publish-publication";
import { ListPublicationVersionsUseCase } from "../application/use-cases/list-publication-versions";
import { RestorePublicationVersionUseCase } from "../application/use-cases/restore-publication-version";
import { UploadPublicationImageUseCase } from "../application/use-cases/upload-publication-image";
import { RequestPublicationExportUseCase } from "../application/use-cases/request-publication-export";
import { ListPublicationExportsUseCase } from "../application/use-cases/list-publication-exports";
import { GetPublicationExportFileUseCase } from "../application/use-cases/get-publication-export-file";

// Exported (not just module-private) so register-job-handlers.ts can reuse
// these exact same instances rather than constructing a second, parallel
// set of repositories — the job handler and the route handlers must share
// one Prisma-backed repository graph, not two independent ones.
export const publicationRepository = new PrismaPublicationRepository(prisma);
export const templateRepository = new PrismaPublicationTemplateRepository(prisma);
export const versionRepository = new PrismaPublicationVersionRepository(prisma);
export const exportRepository = new PrismaPublicationExportRepository(prisma);
export const dataLookup = new PrismaPublicationDataLookup(prisma);
export const imageFileRepository = new PrismaPublicationImageFileRepository(prisma);
export const exportFileRepository = new PrismaPublicationExportFileRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const listPublicationTemplatesUseCase = new ListPublicationTemplatesUseCase({ templateRepository });
export const getPublicationTemplateUseCase = new GetPublicationTemplateUseCase({ templateRepository });
export const listSelectableDataUseCase = new ListSelectableDataUseCase({ dataLookup });
export const getPreviewDataUseCase = new GetPreviewDataUseCase({ dataLookup });
export const createPublicationUseCase = new CreatePublicationUseCase({ publicationRepository, templateRepository, auditRecorder });
export const updatePublicationUseCase = new UpdatePublicationUseCase({ publicationRepository, auditRecorder });
export const getPublicationUseCase = new GetPublicationUseCase({ publicationRepository });
export const searchPublicationsUseCase = new SearchPublicationsUseCase({ publicationRepository });
export const deletePublicationUseCase = new DeletePublicationUseCase({ publicationRepository, auditRecorder });
export const publishPublicationUseCase = new PublishPublicationUseCase({ publicationRepository, versionRepository, auditRecorder });
export const listPublicationVersionsUseCase = new ListPublicationVersionsUseCase({ publicationRepository, versionRepository });
export const restorePublicationVersionUseCase = new RestorePublicationVersionUseCase({ publicationRepository, versionRepository, auditRecorder });
export const uploadPublicationImageUseCase = new UploadPublicationImageUseCase({ imageFileRepository, saveFile });
export const requestPublicationExportUseCase = new RequestPublicationExportUseCase({ publicationRepository, exportRepository, jobDispatcher, auditRecorder });
export const listPublicationExportsUseCase = new ListPublicationExportsUseCase({ publicationRepository, exportRepository });
export const getPublicationExportFileUseCase = new GetPublicationExportFileUseCase({ exportRepository, exportFileRepository });
