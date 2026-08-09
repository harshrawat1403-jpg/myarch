import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { PublicationExportNotFoundError } from "../../domain/errors";
import type { PublicationExportRepository } from "../ports/publication-export-repository";
import type { PublicationExportFileRecord, PublicationExportFileRepository } from "../ports/publication-file-repository";

/** V4.0 E5 — authenticated export download; PublicationExport files are always PRIVATE, never served through the public /api/files/[fileId] route. */
export class GetPublicationExportFileUseCase {
  constructor(
    private readonly deps: {
      exportRepository: PublicationExportRepository;
      exportFileRepository: PublicationExportFileRepository;
    },
  ) {}

  async execute(actor: AuthenticatedActor, exportId: string): Promise<PublicationExportFileRecord> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to download this export");

    const exportRecord = await this.deps.exportRepository.findById(exportId);
    if (!exportRecord || exportRecord.status !== "READY" || !exportRecord.fileId) throw new PublicationExportNotFoundError();

    const file = await this.deps.exportFileRepository.findById(exportRecord.fileId);
    if (!file) throw new PublicationExportNotFoundError();
    return file;
  }
}
