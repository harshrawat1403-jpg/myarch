import crypto from "node:crypto";
import type { PublicationContent, PublicationVersionRecord } from "../../../src/modules/publications";
import type { PublicationVersionRepository } from "../../../src/modules/publications/application/ports/publication-version-repository";

export class InMemoryPublicationVersionRepository implements PublicationVersionRepository {
  private readonly versions: PublicationVersionRecord[] = [];

  async create(input: { publicationId: string; content: PublicationContent; label: string | null; createdByUserId: string }): Promise<PublicationVersionRecord> {
    const existingCount = this.versions.filter((v) => v.publicationId === input.publicationId).length;
    const record: PublicationVersionRecord = {
      id: crypto.randomUUID(),
      publicationId: input.publicationId,
      versionNumber: existingCount + 1,
      content: input.content,
      label: input.label,
      createdByUserId: input.createdByUserId,
      createdAt: new Date(),
    };
    this.versions.push(record);
    return record;
  }

  async listForPublication(publicationId: string): Promise<PublicationVersionRecord[]> {
    return this.versions.filter((v) => v.publicationId === publicationId);
  }

  async findByVersionNumber(publicationId: string, versionNumber: number): Promise<PublicationVersionRecord | null> {
    return this.versions.find((v) => v.publicationId === publicationId && v.versionNumber === versionNumber) ?? null;
  }
}
