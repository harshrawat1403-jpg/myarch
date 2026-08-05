import type { Prisma, PrismaClient, StudentPublicProfileDraft } from "@prisma/client";
import type {
  ApprovalQueueItem,
  ProfileContent,
  ProfileDraft,
  ProfileDraftStatus,
} from "../domain/entities";
import type { ProfileDraftRepository } from "../application/ports/profile-draft-repository";

export class PrismaProfileDraftRepository implements ProfileDraftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByStudentId(studentProfileId: string): Promise<ProfileDraft | null> {
    const row = await this.prisma.studentPublicProfileDraft.findUnique({
      where: { studentProfileId },
    });
    return row ? toDomain(row) : null;
  }

  async findById(draftId: string): Promise<ProfileDraft | null> {
    const row = await this.prisma.studentPublicProfileDraft.findUnique({ where: { id: draftId } });
    return row ? toDomain(row) : null;
  }

  async create(studentProfileId: string): Promise<ProfileDraft> {
    const row = await this.prisma.studentPublicProfileDraft.create({
      data: { studentProfileId },
    });
    return toDomain(row);
  }

  async updateContent(
    draftId: string,
    content: Partial<ProfileContent>,
    status: ProfileDraftStatus,
  ): Promise<ProfileDraft> {
    const row = await this.prisma.studentPublicProfileDraft.update({
      where: { id: draftId },
      data: {
        bio: content.bio,
        skills: content.skills ? [...content.skills] : undefined,
        software: content.software ? [...content.software] : undefined,
        selectedProjects: content.selectedProjects
          ? (content.selectedProjects as unknown as Prisma.InputJsonValue)
          : undefined,
        portfolioLinks: content.portfolioLinks ? [...content.portfolioLinks] : undefined,
        resumeFileId: content.resumeFileId,
        certifications: content.certifications
          ? (content.certifications as unknown as Prisma.InputJsonValue)
          : undefined,
        internships: content.internships
          ? (content.internships as unknown as Prisma.InputJsonValue)
          : undefined,
        status,
      },
    });
    return toDomain(row);
  }

  async transitionStatus(
    draftId: string,
    data: {
      status: ProfileDraftStatus;
      submittedAt?: Date | null;
      reviewedByUserId?: string | null;
      reviewedAt?: Date | null;
      reviewComment?: string | null;
    },
  ): Promise<ProfileDraft> {
    const row = await this.prisma.studentPublicProfileDraft.update({
      where: { id: draftId },
      data: {
        status: data.status,
        submittedAt: data.submittedAt,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: data.reviewedAt,
        rejectionReason: data.reviewComment,
      },
    });
    return toDomain(row);
  }

  async listPendingReview(scope: { batchIds?: readonly string[] }): Promise<ApprovalQueueItem[]> {
    const rows = await this.prisma.studentPublicProfileDraft.findMany({
      where: {
        status: "PENDING_REVIEW",
        studentProfile: scope.batchIds ? { batchId: { in: [...scope.batchIds] } } : undefined,
      },
      include: { studentProfile: true },
      orderBy: { submittedAt: "asc" },
    });

    return rows.map((row) => ({
      draftId: row.id,
      studentProfileId: row.studentProfileId,
      studentFullName: row.studentProfile.fullName,
      batchId: row.studentProfile.batchId,
      submittedAt: row.submittedAt,
    }));
  }
}

function toDomain(row: StudentPublicProfileDraft): ProfileDraft {
  return {
    id: row.id,
    studentProfileId: row.studentProfileId,
    bio: row.bio,
    skills: row.skills,
    software: row.software,
    selectedProjects: row.selectedProjects as unknown as ProfileDraft["selectedProjects"],
    portfolioLinks: row.portfolioLinks,
    resumeFileId: row.resumeFileId,
    certifications: row.certifications as unknown as ProfileDraft["certifications"],
    internships: row.internships as unknown as ProfileDraft["internships"],
    status: row.status,
    submittedAt: row.submittedAt,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    reviewComment: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
