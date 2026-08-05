import type { Prisma, PrismaClient } from "@prisma/client";
import type { ExportScope, StudentDirectoryRow } from "../domain/entities";
import type { StudentDirectoryExportRepository } from "../application/ports/student-directory-export-repository";

type StudentDirectoryRowPayload = Prisma.StudentProfileGetPayload<{
  include: { batch: true; user: true; publicProfile: true; draft: true };
}>;

/**
 * Never selects StudentPrivateProfile — "Never include: Password, Hashes,
 * CGPA, Backlogs, Personal Email, Phone, Internal Remarks, Confidential
 * Documents." `User.passwordHash` is included in the raw Prisma row (the
 * `user` relation has no field-level select restricting it), but `toRow()`
 * below reads only `user.email` — the hash is never touched by the mapper,
 * matching the "explicit mapping, no object spreading" rule.
 */
export class PrismaStudentDirectoryExportRepository implements StudentDirectoryExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async fetch(scope: ExportScope): Promise<StudentDirectoryRow[]> {
    const rows = await this.prisma.studentProfile.findMany({
      where: scope.batchIds ? { batchId: { in: [...scope.batchIds] } } : undefined,
      include: { batch: true, user: true, publicProfile: true, draft: true },
      orderBy: { fullName: "asc" },
    });

    return rows.map(toRow);
  }
}

export function toRow(row: StudentDirectoryRowPayload): StudentDirectoryRow {
  return {
    fullName: row.fullName,
    rollNumber: row.rollNumber,
    batchName: row.batch.name,
    instituteEmail: row.user.email,
    skills: row.publicProfile?.skills ?? row.draft?.skills ?? [],
    software: row.publicProfile?.software ?? row.draft?.software ?? [],
    resumeAvailable: row.publicProfile?.resumeFileId != null,
    portfolioAvailable: (row.publicProfile?.portfolioLinks.length ?? 0) > 0,
    activeStatus: row.isActive,
  };
}
