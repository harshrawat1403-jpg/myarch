import type { JobHandler } from "@/modules/jobs";
import { GENERATE_PUBLICATION_EXPORT_JOB_TYPE } from "../domain/entities";
import type { GeneratePublicationExportJobPayload, PublicationExportFormat } from "../domain/entities";
import type { PublicationRepository } from "../application/ports/publication-repository";
import type { PublicationExportRepository } from "../application/ports/publication-export-repository";
import type { PublicationExportFileRepository } from "../application/ports/publication-file-repository";
import type { PublicationDataLookup } from "../application/ports/publication-data-lookup";
import { resolvePublicationData, buildDataUriResolver } from "./export/resolve-export-data";
import { renderPublicationPdf } from "./export/render-pdf";
import { renderPublicationRasterZip } from "./export/render-raster";
import { renderPublicationPptx } from "./export/render-pptx";
import type { PrismaClient } from "@prisma/client";

const MIME_TYPES: Record<PublicationExportFormat, string> = {
  PDF: "application/pdf",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  PNG: "application/zip",
  JPEG: "application/zip",
};

const EXTENSIONS: Record<PublicationExportFormat, string> = {
  PDF: "pdf",
  PPTX: "pptx",
  PNG: "zip",
  JPEG: "zip",
};

/**
 * V4.0 E5 (§13.1 step 6, §13.4, §19) — the first job-dispatched file-
 * generation handler in this codebase (src/modules/exports/ is
 * synchronous); registered/run the same way NotificationJobHandler already
 * is. `onPermanentFailure` marks the PublicationExport row FAILED once the
 * worker's own retry policy gives up, mirroring that handler's exact split
 * between "let the worker retry transient failures" and "record the
 * terminal outcome once retries are exhausted."
 */
export class PublicationExportJobHandler implements JobHandler {
  readonly type = GENERATE_PUBLICATION_EXPORT_JOB_TYPE;

  constructor(
    private readonly deps: {
      prisma: PrismaClient;
      publicationRepository: PublicationRepository;
      exportRepository: PublicationExportRepository;
      exportFileRepository: PublicationExportFileRepository;
      dataLookup: PublicationDataLookup;
      saveFile(storageKey: string, data: Buffer): Promise<void>;
    },
  ) {}

  async handle(rawPayload: Record<string, unknown>): Promise<void> {
    const payload = rawPayload as unknown as GeneratePublicationExportJobPayload;

    const publication = await this.deps.publicationRepository.findById(payload.publicationId);
    if (!publication) {
      await this.deps.exportRepository.markFailed(payload.exportId, "Publication no longer exists");
      return;
    }

    await this.deps.exportRepository.markGenerating(payload.exportId);

    const resolvedData = await resolvePublicationData(publication.content, this.deps.dataLookup);
    const resolveImageSrc = await buildDataUriResolver(this.deps.prisma, publication.content, resolvedData);

    const buffer = await this.renderFormat(payload.format, publication.content, publication.pageSize, resolvedData, resolveImageSrc);

    const storageKey = `publications/exports/${payload.publicationId}-${Date.now()}.${EXTENSIONS[payload.format]}`;
    await this.deps.saveFile(storageKey, buffer);

    const fileAsset = await this.deps.exportFileRepository.create({
      ownerUserId: publication.createdByUserId,
      storageKey,
      mimeType: MIME_TYPES[payload.format],
      sizeBytes: buffer.byteLength,
    });

    await this.deps.exportRepository.markReady(payload.exportId, fileAsset.id);
  }

  private async renderFormat(
    format: PublicationExportFormat,
    content: Parameters<typeof resolvePublicationData>[0],
    pageSize: Parameters<typeof renderPublicationPdf>[1],
    resolvedData: Awaited<ReturnType<typeof resolvePublicationData>>,
    resolveImageSrc: (fileId: string) => string,
  ): Promise<Buffer> {
    switch (format) {
      case "PDF":
        return renderPublicationPdf(content, pageSize, resolvedData, resolveImageSrc);
      case "PNG":
        return renderPublicationRasterZip(content, pageSize, resolvedData, resolveImageSrc, "PNG");
      case "JPEG":
        return renderPublicationRasterZip(content, pageSize, resolvedData, resolveImageSrc, "JPEG");
      case "PPTX":
        return renderPublicationPptx(content, pageSize, resolvedData, resolveImageSrc);
    }
  }

  async onPermanentFailure(rawPayload: Record<string, unknown>, error: Error): Promise<void> {
    const payload = rawPayload as unknown as GeneratePublicationExportJobPayload;
    await this.deps.exportRepository.markFailed(payload.exportId, error.message);
  }
}
