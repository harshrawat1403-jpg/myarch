import crypto from "node:crypto";
import type { ProfileContent, PublishedProfile } from "../../../src/modules/profiles/domain/entities";
import type { PublishedProfileRepository } from "../../../src/modules/profiles/application/ports/published-profile-repository";

export class InMemoryPublishedProfileRepository implements PublishedProfileRepository {
  private readonly byStudentId = new Map<string, PublishedProfile>();

  async findByStudentId(studentProfileId: string): Promise<PublishedProfile | null> {
    return this.byStudentId.get(studentProfileId) ?? null;
  }

  async publish(data: {
    studentProfileId: string;
    content: ProfileContent;
    publishedFromDraftId: string;
    publishedByUserId: string;
  }): Promise<PublishedProfile> {
    const existing = this.byStudentId.get(data.studentProfileId);
    const published: PublishedProfile = {
      id: existing?.id ?? crypto.randomUUID(),
      studentProfileId: data.studentProfileId,
      ...data.content,
      publishedFromDraftId: data.publishedFromDraftId,
      publishedAt: new Date(),
      publishedByUserId: data.publishedByUserId,
    };
    this.byStudentId.set(data.studentProfileId, published);
    return published;
  }
}
