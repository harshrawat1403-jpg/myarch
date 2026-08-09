import type { ProfileContent, PublishedProfile } from "../../domain/entities";

export interface PublishedProfileRepository {
  findByStudentId(studentProfileId: string): Promise<PublishedProfile | null>;

  /**
   * The ONLY write path for a published profile's CONTENT — creates it on
   * first approval, updates it (upsert) on every subsequent approval. Never
   * touches isPubliclyDiscoverable/showCgpa (see updateVisibility below) —
   * content approval and visibility control are deliberately independent,
   * so re-approving an edited profile never silently resets a student's
   * chosen visibility settings back to their defaults.
   */
  publish(data: {
    studentProfileId: string;
    content: ProfileContent;
    publishedFromDraftId: string;
    publishedByUserId: string;
  }): Promise<PublishedProfile>;

  /**
   * V4.0 B4: the one deliberate exception to "immutable until approval" —
   * these are visibility settings, not profile content, so the student
   * controls them directly without a draft/approval round-trip (§7).
   */
  updateVisibility(
    studentProfileId: string,
    data: { isPubliclyDiscoverable?: boolean; showCgpa?: boolean },
  ): Promise<PublishedProfile>;
}
