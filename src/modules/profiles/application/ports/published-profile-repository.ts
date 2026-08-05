import type { ProfileContent, PublishedProfile } from "../../domain/entities";

export interface PublishedProfileRepository {
  findByStudentId(studentProfileId: string): Promise<PublishedProfile | null>;

  /**
   * The ONLY write path for StudentPublicProfile — creates it on first
   * approval, updates it (upsert) on every subsequent approval. There is no
   * separate "edit published profile" method anywhere in this codebase by
   * design (docs' "immutable until approval" requirement).
   */
  publish(data: {
    studentProfileId: string;
    content: ProfileContent;
    publishedFromDraftId: string;
    publishedByUserId: string;
  }): Promise<PublishedProfile>;
}
