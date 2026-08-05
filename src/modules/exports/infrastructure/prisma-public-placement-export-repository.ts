import type { Prisma, PrismaClient } from "@prisma/client";
import type { CertificationEntry, InternshipEntry } from "@/modules/profiles";
import type { ExportScope, PublicPlacementRow } from "../domain/entities";
import type { PublicPlacementExportRepository } from "../application/ports/public-placement-export-repository";

type PublicPlacementRowPayload = Prisma.StudentPublicProfileGetPayload<{
  include: { studentProfile: { include: { batch: true } } };
}>;

/**
 * Rooted at StudentPublicProfile — the same structural "approved only"
 * guarantee as the recruiters module (Days 8–9): a student who is DRAFT,
 * PENDING_REVIEW, or CHANGES_REQUESTED has no row here at all. Never reads
 * StudentPublicProfileDraft or StudentPrivateProfile.
 */
export class PrismaPublicPlacementExportRepository implements PublicPlacementExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetch(scope: ExportScope): Promise<PublicPlacementRow[]> {
    const rows = await this.prisma.studentPublicProfile.findMany({
      where: scope.batchIds
        ? { studentProfile: { batchId: { in: [...scope.batchIds] } } }
        : undefined,
      include: { studentProfile: { include: { batch: true } } },
    });

    return rows
      .map(toRow)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}

export function toRow(row: PublicPlacementRowPayload): PublicPlacementRow {
  const certifications = row.certifications as unknown as CertificationEntry[];
  const internships = row.internships as unknown as InternshipEntry[];

  return {
    fullName: row.studentProfile.fullName,
    batchName: row.studentProfile.batch.name,
    bio: row.bio,
    skills: row.skills,
    software: row.software,
    certifications: certifications.map((entry) => entry.title),
    internshipExperience: internships.map((entry) => entry.company),
    portfolioLinks: row.portfolioLinks,
    resumeAvailable: row.resumeFileId !== null,
  };
}
