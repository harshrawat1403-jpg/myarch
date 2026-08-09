import type { PublicationExportFormat, PublicationExportRecord } from "../../domain/entities";

export interface PublicationExportRepository {
  create(input: { publicationId: string; format: PublicationExportFormat; generatedByUserId: string }): Promise<PublicationExportRecord>;
  findById(id: string): Promise<PublicationExportRecord | null>;
  listForPublication(publicationId: string): Promise<PublicationExportRecord[]>;
  markGenerating(id: string): Promise<void>;
  markReady(id: string, fileId: string): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}
