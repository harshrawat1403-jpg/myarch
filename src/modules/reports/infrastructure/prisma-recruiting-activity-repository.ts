import type { PrismaClient } from "@prisma/client";
import type { RecruitingActivityCounts, RecruitingActivityRepository } from "../application/ports/recruiting-activity-repository";

export class PrismaRecruitingActivityRepository implements RecruitingActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRecruiterProfileId(userId: string): Promise<string | null> {
    const recruiter = await this.prisma.recruiterProfile.findUnique({ where: { userId }, select: { id: true } });
    return recruiter?.id ?? null;
  }

  async getForRecruiter(recruiterProfileId: string): Promise<RecruitingActivityCounts> {
    const [savedCount, shortlistedCount, interests] = await Promise.all([
      this.prisma.recruiterStudentInteraction.count({ where: { recruiterProfileId, savedAt: { not: null } } }),
      this.prisma.recruiterStudentInteraction.count({ where: { recruiterProfileId, isShortlisted: true } }),
      this.prisma.recruiterInterestRequest.findMany({
        where: { recruiterProfileId },
        select: { status: true, sentAt: true, studentProfile: { select: { fullName: true } } },
        orderBy: { sentAt: "desc" },
      }),
    ]);

    return {
      savedCount,
      shortlistedCount,
      interestsSentCount: interests.length,
      interestsAcceptedCount: interests.filter((i) => i.status === "ACCEPTED" || i.status === "COMPLETED").length,
      interestsDeclinedCount: interests.filter((i) => i.status === "DECLINED").length,
      interestsPendingCount: interests.filter((i) => i.status === "SENT").length,
      interests: interests.map((i) => ({ studentName: i.studentProfile.fullName, status: i.status, sentAt: i.sentAt })),
    };
  }
}
