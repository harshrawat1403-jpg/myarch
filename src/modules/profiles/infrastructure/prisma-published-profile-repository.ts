import type { Prisma, PrismaClient, StudentPublicProfile } from "@prisma/client";
import { deleteFile } from "@/lib/file-storage";
import type { ProfileContent, PublishedProfile } from "../domain/entities";
import type { PublishedProfileRepository } from "../application/ports/published-profile-repository";

export class PrismaPublishedProfileRepository implements PublishedProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByStudentId(studentProfileId: string): Promise<PublishedProfile | null> {
    const row = await this.prisma.studentPublicProfile.findUnique({ where: { studentProfileId }, include: { portfolioImages: { orderBy: { sortOrder: "asc" } } } });
    return row ? toDomain(row) : null;
  }

  async publish(data: {
    studentProfileId: string;
    content: ProfileContent;
    publishedFromDraftId: string;
    publishedByUserId: string;
  }): Promise<PublishedProfile> {
    const previous = await this.prisma.studentPublicProfile.findUnique({ where: { studentProfileId: data.studentProfileId }, select: { id: true, resumeFileId: true } });
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

    if (data.content.portfolioImages) {
      const imageIds = data.content.portfolioImages.map((image) => image.id);
      const stale = await this.prisma.studentPortfolioImage.findMany({ where: { publishedProfileId: row.id, draftId: null, id: { notIn: imageIds } }, include: { file: true } });
      await this.prisma.studentPortfolioImage.deleteMany({ where: { id: { in: stale.map((image) => image.id) } } });
      await this.prisma.fileAsset.deleteMany({ where: { id: { in: stale.map((image) => image.fileId) } } });
      await Promise.all(stale.map((image) => deleteFile(image.file.storageKey).catch(() => undefined)));
      await this.prisma.studentPortfolioImage.updateMany({ where: { draftId: data.publishedFromDraftId, id: { in: imageIds } }, data: { publishedProfileId: row.id } });
      await this.prisma.fileAsset.updateMany({ where: { id: { in: data.content.portfolioImages.map((image) => image.fileId) } }, data: { classification: "PUBLIC" } });
    }
    if (data.content.resumeFileId) await this.prisma.fileAsset.update({ where: { id: data.content.resumeFileId }, data: { classification: "PUBLIC" } });
    if (previous?.resumeFileId && previous.resumeFileId !== data.content.resumeFileId) {
      const old = await this.prisma.fileAsset.delete({ where: { id: previous.resumeFileId } }).catch(() => null);
      if (old) await deleteFile(old.storageKey).catch(() => undefined);
    }
    return toDomain(await this.prisma.studentPublicProfile.findUniqueOrThrow({ where: { id: row.id }, include: { portfolioImages: { orderBy: { sortOrder: "asc" } } } }));
  }

  async updateVisibility(
    studentProfileId: string,
    data: { isPubliclyDiscoverable?: boolean; showCgpa?: boolean },
  ): Promise<PublishedProfile> {
    const row = await this.prisma.studentPublicProfile.update({
      where: { studentProfileId },
      data: { isPubliclyDiscoverable: data.isPubliclyDiscoverable, showCgpa: data.showCgpa },
    });
    return toDomain(row);
  }
}

function toDomain(row: StudentPublicProfile & { portfolioImages?: { id: string; fileId: string; title: string | null; caption: string | null; sortOrder: number }[] }): PublishedProfile {
  return {
    id: row.id,
    studentProfileId: row.studentProfileId,
    bio: row.bio,
    skills: row.skills,
    software: row.software,
    selectedProjects: row.selectedProjects as unknown as PublishedProfile["selectedProjects"],
    portfolioLinks: row.portfolioLinks,
    portfolioImages: row.portfolioImages?.map((image) => ({ id: image.id, fileId: image.fileId, title: image.title, caption: image.caption, sortOrder: image.sortOrder })) ?? [],
    resumeFileId: row.resumeFileId,
    certifications: row.certifications as unknown as PublishedProfile["certifications"],
    internships: row.internships as unknown as PublishedProfile["internships"],
    publishedFromDraftId: row.publishedFromDraftId,
    publishedAt: row.publishedAt,
    publishedByUserId: row.publishedByUserId,
    isPubliclyDiscoverable: row.isPubliclyDiscoverable,
    showCgpa: row.showCgpa,
  };
}
