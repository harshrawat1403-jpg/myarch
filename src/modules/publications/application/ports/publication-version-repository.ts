import type { PublicationContent } from "../../domain/blocks";
import type { PublicationVersionRecord } from "../../domain/entities";

export interface PublicationVersionRepository {
  /** Appends the next version number for this publication (§13.4 — append-only, mirrors AcademicYearTransitionRun's frozen-snapshot pattern). */
  create(input: { publicationId: string; content: PublicationContent; label: string | null; createdByUserId: string }): Promise<PublicationVersionRecord>;
  listForPublication(publicationId: string): Promise<PublicationVersionRecord[]>;
  findByVersionNumber(publicationId: string, versionNumber: number): Promise<PublicationVersionRecord | null>;
}
