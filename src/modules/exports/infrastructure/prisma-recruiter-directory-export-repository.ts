import type { Prisma, PrismaClient } from "@prisma/client";
import type { RecruiterDirectoryRow } from "../domain/entities";
import type { RecruiterDirectoryExportRepository } from "../application/ports/recruiter-directory-export-repository";

type RecruiterProfileWithUser = Prisma.RecruiterProfileGetPayload<{ include: { user: true } }>;

export class PrismaRecruiterDirectoryExportRepository implements RecruiterDirectoryExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetch(): Promise<RecruiterDirectoryRow[]> {
    const rows = await this.prisma.recruiterProfile.findMany({
      include: { user: true },
      orderBy: { companyName: "asc" },
    });

    return rows.map(toRow);
  }
}

export function toRow(row: RecruiterProfileWithUser): RecruiterDirectoryRow {
  return {
    company: row.companyName,
    contactPerson: row.fullName,
    officialEmail: row.user.email,
    // PlacementDrive does not exist in the Phase 1 schema — see
    // domain/entities.ts's RecruiterDirectoryRow doc comment.
    activeDrives: 0,
  };
}
