import type { Prisma, PrismaClient } from "@prisma/client";
import type { RecruiterDirectoryRow } from "../domain/entities";
import type { RecruiterDirectoryExportRepository } from "../application/ports/recruiter-directory-export-repository";

type RecruiterProfileWithUser = Prisma.RecruiterProfileGetPayload<{ include: { user: true } }>;

/** "Active" mirrors every other "open drive" definition in the codebase (e.g. ListOpenDrivesForStudentUseCase) — ANNOUNCED or IN_PROGRESS, never DRAFT/CLOSED. */
const ACTIVE_DRIVE_STATUSES = ["ANNOUNCED", "IN_PROGRESS"] as const;

export class PrismaRecruiterDirectoryExportRepository implements RecruiterDirectoryExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetch(): Promise<RecruiterDirectoryRow[]> {
    const [recruiters, driveCounts] = await Promise.all([
      this.prisma.recruiterProfile.findMany({ include: { user: true }, orderBy: { companyName: "asc" } }),
      // V4.0 E7 (data-accuracy fix — see domain/entities.ts's RecruiterDirectoryRow
      // doc comment: PlacementDrive didn't exist in the Phase 1 schema this
      // export was originally written against; it does now, via D1). One
      // grouped aggregation query, not one query per recruiter (§19 — no N+1).
      // RecruiterProfile.companyName is still a free-text field (never migrated
      // to a Company FK — see this milestone's completion report), so the only
      // available join is a company-name match, same as any recruiter would
      // recognize their own listing by.
      this.prisma.placementDrive.groupBy({
        by: ["companyId"],
        where: { status: { in: [...ACTIVE_DRIVE_STATUSES] } },
        _count: { _all: true },
      }),
    ]);

    const companyIds = driveCounts.map((d) => d.companyId);
    const companies = companyIds.length > 0 ? await this.prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }) : [];
    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
    const activeDrivesByCompanyName = new Map<string, number>();
    for (const entry of driveCounts) {
      const name = companyNameById.get(entry.companyId);
      if (name) activeDrivesByCompanyName.set(name, entry._count._all);
    }

    return recruiters.map((row) => toRow(row, activeDrivesByCompanyName.get(row.companyName) ?? 0));
  }
}

export function toRow(row: RecruiterProfileWithUser, activeDrives: number): RecruiterDirectoryRow {
  return {
    company: row.companyName,
    contactPerson: row.fullName,
    officialEmail: row.user.email,
    activeDrives,
  };
}
