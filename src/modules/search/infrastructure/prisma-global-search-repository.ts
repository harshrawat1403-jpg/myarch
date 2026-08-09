import type { PrismaClient } from "@prisma/client";
import type { CompanySearchResult, PublicationSearchResult, StudentSearchResult } from "../domain/entities";
import type { DriveSearchRow, GlobalSearchRepository } from "../application/ports/global-search-repository";

interface StudentRow {
  id: string;
  fullName: string;
  rollNumber: string | null;
  batchName: string;
}

interface CompanyRow {
  id: string;
  name: string;
  sector: string | null;
}

interface DriveRow {
  id: string;
  title: string;
  status: string;
  companyName: string;
  eligibility: unknown;
  applicationDeadline: Date | null;
}

interface PublicationRow {
  id: string;
  title: string;
  status: string;
}

function eligibleBatchIdsOf(eligibility: unknown): readonly string[] {
  if (eligibility && typeof eligibility === "object" && Array.isArray((eligibility as { eligibleBatchIds?: unknown }).eligibleBatchIds)) {
    return (eligibility as { eligibleBatchIds: unknown[] }).eligibleBatchIds.filter((id): id is string => typeof id === "string");
  }
  return [];
}

/**
 * V4.0 E6 (PRD §15/§19) — full-text search via the GENERATED tsvector
 * columns added by migration 20260809060229_add_search_vectors, queried
 * with `@@ plainto_tsquery(...)` and ranked with `ts_rank`, never
 * `ILIKE '%term%'`. Every query is `LIMIT`-bounded (§19 — no unbounded
 * result sets) and rooted at the correct base table for the audience
 * (student_public_profiles for the Recruiter-facing method, exactly like
 * PrismaRecruiterDirectoryRepository).
 */
export class PrismaGlobalSearchRepository implements GlobalSearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async searchStudentsForStaff(query: string, opts: { batchIds?: readonly string[]; limit: number }): Promise<StudentSearchResult[]> {
    const rows = opts.batchIds
      ? await this.prisma.$queryRaw<StudentRow[]>`
          SELECT sp.id, sp."fullName", sp."rollNumber", b.name AS "batchName"
          FROM "student_profiles" sp
          JOIN "batches" b ON b.id = sp."batchId"
          WHERE sp."searchVector" @@ plainto_tsquery('english', ${query})
            AND sp."batchId" = ANY(${opts.batchIds}::uuid[])
          ORDER BY ts_rank(sp."searchVector", plainto_tsquery('english', ${query})) DESC
          LIMIT ${opts.limit}
        `
      : await this.prisma.$queryRaw<StudentRow[]>`
          SELECT sp.id, sp."fullName", sp."rollNumber", b.name AS "batchName"
          FROM "student_profiles" sp
          JOIN "batches" b ON b.id = sp."batchId"
          WHERE sp."searchVector" @@ plainto_tsquery('english', ${query})
          ORDER BY ts_rank(sp."searchVector", plainto_tsquery('english', ${query})) DESC
          LIMIT ${opts.limit}
        `;
    return rows.map((r) => ({ kind: "STUDENT", id: r.id, fullName: r.fullName, batchName: r.batchName, rollNumber: r.rollNumber }));
  }

  async searchStudentsForRecruiter(query: string, limit: number): Promise<StudentSearchResult[]> {
    const rows = await this.prisma.$queryRaw<StudentRow[]>`
      SELECT sp.id, sp."fullName", b.name AS "batchName"
      FROM "student_public_profiles" spp
      JOIN "student_profiles" sp ON sp.id = spp."studentProfileId"
      JOIN "batches" b ON b.id = sp."batchId"
      WHERE sp."searchVector" @@ plainto_tsquery('english', ${query})
        AND sp."isActive" = true
        AND b.status = 'ACTIVE'
      ORDER BY ts_rank(sp."searchVector", plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ kind: "STUDENT", id: r.id, fullName: r.fullName, batchName: r.batchName, rollNumber: null }));
  }

  async searchCompanies(query: string, limit: number): Promise<CompanySearchResult[]> {
    const rows = await this.prisma.$queryRaw<CompanyRow[]>`
      SELECT id, name, sector
      FROM "companies"
      WHERE "searchVector" @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ kind: "COMPANY", id: r.id, name: r.name, sector: r.sector }));
  }

  async searchDrives(query: string, limit: number): Promise<DriveSearchRow[]> {
    const rows = await this.prisma.$queryRaw<DriveRow[]>`
      SELECT pd.id, pd.title, pd.status, c.name AS "companyName", pd.eligibility, pd."applicationDeadline"
      FROM "placement_drives" pd
      JOIN "companies" c ON c.id = pd."companyId"
      WHERE pd."searchVector" @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(pd."searchVector", plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as DriveSearchRow["status"],
      companyName: r.companyName,
      eligibleBatchIds: eligibleBatchIdsOf(r.eligibility),
      applicationDeadline: r.applicationDeadline,
    }));
  }

  async searchPublications(query: string, limit: number): Promise<PublicationSearchResult[]> {
    const rows = await this.prisma.$queryRaw<PublicationRow[]>`
      SELECT id, title, status
      FROM "publications"
      WHERE "searchVector" @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ kind: "PUBLICATION", id: r.id, title: r.title, status: r.status as PublicationSearchResult["status"] }));
  }

  async findStudentBatchId(studentProfileId: string): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({ where: { id: studentProfileId }, select: { batchId: true } });
    return student?.batchId ?? null;
  }
}
