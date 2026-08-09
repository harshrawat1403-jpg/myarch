import type { PrismaClient, RecruiterStudentInteraction } from "@prisma/client";
import type {
  RecruiterInteractionRecord,
  RecruiterInteractionRepository,
} from "../application/ports/recruiter-interaction-repository";

export class PrismaRecruiterInteractionRepository implements RecruiterInteractionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findManyForRecruiter(
    recruiterProfileId: string,
    studentProfileIds: readonly string[],
  ): Promise<RecruiterInteractionRecord[]> {
    if (studentProfileIds.length === 0) return [];
    const rows = await this.prisma.recruiterStudentInteraction.findMany({
      where: { recruiterProfileId, studentProfileId: { in: [...studentProfileIds] } },
    });
    return rows.map(toDomain);
  }

  async findOneForRecruiter(
    recruiterProfileId: string,
    studentProfileId: string,
  ): Promise<RecruiterInteractionRecord | null> {
    const row = await this.prisma.recruiterStudentInteraction.findUnique({
      where: { recruiterProfileId_studentProfileId: { recruiterProfileId, studentProfileId } },
    });
    return row ? toDomain(row) : null;
  }

  async setSaved(
    recruiterProfileId: string,
    studentProfileId: string,
    saved: boolean,
  ): Promise<RecruiterInteractionRecord> {
    const row = await this.prisma.recruiterStudentInteraction.upsert({
      where: { recruiterProfileId_studentProfileId: { recruiterProfileId, studentProfileId } },
      create: { recruiterProfileId, studentProfileId, savedAt: saved ? new Date() : null },
      // Un-saving also clears isShortlisted — a shortlisted-but-not-saved
      // row would contradict "Shortlist is a filtered view of Saved" (§8).
      update: { savedAt: saved ? new Date() : null, isShortlisted: saved ? undefined : false },
    });
    return toDomain(row);
  }

  async setShortlisted(
    recruiterProfileId: string,
    studentProfileId: string,
    isShortlisted: boolean,
  ): Promise<RecruiterInteractionRecord> {
    const row = await this.prisma.recruiterStudentInteraction.update({
      where: { recruiterProfileId_studentProfileId: { recruiterProfileId, studentProfileId } },
      data: { isShortlisted },
    });
    return toDomain(row);
  }

  async listSavedForRecruiter(recruiterProfileId: string): Promise<RecruiterInteractionRecord[]> {
    const rows = await this.prisma.recruiterStudentInteraction.findMany({
      where: { recruiterProfileId, savedAt: { not: null } },
      orderBy: { savedAt: "desc" },
    });
    return rows.map(toDomain);
  }
}

function toDomain(row: RecruiterStudentInteraction): RecruiterInteractionRecord {
  return {
    studentProfileId: row.studentProfileId,
    isSaved: row.savedAt !== null,
    isShortlisted: row.isShortlisted,
  };
}
