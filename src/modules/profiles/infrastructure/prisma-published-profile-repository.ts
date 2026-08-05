import type { Prisma, PrismaClient, StudentPublicProfile } from "@prisma/client";
import type { ProfileContent, PublishedProfile } from "../domain/entities";
import type { PublishedProfileRepository } from "../application/ports/published-profile-repository";

export class PrismaPublishedProfileRepository implements PublishedProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByStudentId(studentProfileId: string): Promise<PublishedProfile | null> {
    const row = await this.prisma.studentPublicProfile.findUnique({ where: { studentProfileId } });
    return row ? toDomain(row) : null;
  }

  async publish(data: {
    studentProfileId: string;
    content: ProfileContent;
    publishedFromDraftId: string;
    publishedByUserId: string;
  }): Promise<PublishedProfile> {
    const now = new Date();
    const contentData = {
      bio: data.content.bio,
      skills: [...data.content.skills],
      software: [...data.content.software],
      selectedProjects: data.content.selectedProjects as unknown as Prisma.InputJsonValue,
      portfolioLinks: [...data.content.portfolioLinks],
      resumeFileId: data.content.resumeFileId,
      certifications: data.content.certifications as unknown as Prisma.InputJsonValue,
      internships: data.content.internships as unknown as Prisma.InputJsonValue,
      publishedFromDraftId: data.publishedFromDraftId,
      publishedAt: now,
      publishedByUserId: data.publishedByUserId,
    };

    // upsert: create the published profile on first-ever approval,
    // otherwise update the SAME row in place — StudentPublicProfile is
    // never a second row per student (studentProfileId is @unique), and is
    // never written to from anywhere except this one method.
    const row = await this.prisma.studentPublicProfile.upsert({
      where: { studentProfileId: data.studentProfileId },
      create: { studentProfileId: data.studentProfileId, ...contentData },
      update: contentData,
    });

    return toDomain(row);
  }
}

function toDomain(row: StudentPublicProfile): PublishedProfile {
  return {
    id: row.id,
    studentProfileId: row.studentProfileId,
    bio: row.bio,
    skills: row.skills,
    software: row.software,
    selectedProjects: row.selectedProjects as unknown as PublishedProfile["selectedProjects"],
    portfolioLinks: row.portfolioLinks,
    resumeFileId: row.resumeFileId,
    certifications: row.certifications as unknown as PublishedProfile["certifications"],
    internships: row.internships as unknown as PublishedProfile["internships"],
    publishedFromDraftId: row.publishedFromDraftId,
    publishedAt: row.publishedAt,
    publishedByUserId: row.publishedByUserId,
  };
}
