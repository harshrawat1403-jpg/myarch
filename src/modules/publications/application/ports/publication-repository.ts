import type { PublicationContent } from "../../domain/blocks";
import type { PublicationPageSize, PublicationRecord, PublicationStatus, PublicationSummaryDTO, PublicationType } from "../../domain/entities";

export interface CreatePublicationInput {
  readonly title: string;
  readonly type: PublicationType;
  readonly templateId: string | null;
  readonly content: PublicationContent;
  readonly pageSize: PublicationPageSize;
  readonly createdByUserId: string;
}

export interface PublicationSearchFilters {
  readonly status?: PublicationStatus;
  readonly type?: PublicationType;
}

export interface PublicationRepository {
  create(input: CreatePublicationInput): Promise<PublicationRecord>;
  findById(id: string): Promise<PublicationRecord | null>;
  search(filters: PublicationSearchFilters): Promise<PublicationSummaryDTO[]>;

  /**
   * Optimistic-lock save (§13.4): succeeds only if `expectedVersion` still
   * matches the row's current `version`, atomically bumping it by one.
   * Returns null on a mismatch — the use case maps that to
   * PublicationVersionConflictError, never silently overwriting.
   */
  updateContent(
    id: string,
    input: { title: string; content: PublicationContent; pageSize: PublicationPageSize; expectedVersion: number; editedByUserId: string },
  ): Promise<PublicationRecord | null>;

  setStatus(id: string, status: PublicationStatus): Promise<PublicationRecord>;
  delete(id: string): Promise<void>;
}
