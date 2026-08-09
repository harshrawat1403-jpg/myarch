import type { PrismaClient } from "@prisma/client";
import type {
  PublicationDataLookup,
  SelectableAlumniOption,
  SelectableCompanyOption,
  SelectableStudentOption,
} from "../application/ports/publication-data-lookup";
import type { ResolvedAlumniProfile, ResolvedCompany, ResolvedStats, ResolvedStudentProfile } from "../domain/entities";

/** "Placed" mirrors §11's own definition exactly: reaching ACCEPTED (or the internship-only states that follow it). */
const PLACED_STATUSES = ["ACCEPTED", "ACTIVE", "COMPLETED"] as const;
const OFFER_OR_BETTER_STATUSES = ["OFFER", ...PLACED_STATUSES] as const;

export class PrismaPublicationDataLookup implements PublicationDataLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async listSelectableStudents(batchId?: string): Promise<SelectableStudentOption[]> {
    // Only students with a real PUBLISHED public profile — the same "never
    // copy-pasted" data source resolveStudents() reads from below.
    const rows = await this.prisma.studentPublicProfile.findMany({
      where: { studentProfile: { isActive: true, batchId } },
      select: {
        studentProfileId: true,
        studentProfile: { select: { fullName: true, batchId: true, batch: { select: { name: true } } } },
      },
      orderBy: { studentProfile: { fullName: "asc" } },
    });
    return rows.map((row) => ({
      studentProfileId: row.studentProfileId,
      fullName: row.studentProfile.fullName,
      batchId: row.studentProfile.batchId,
      batchName: row.studentProfile.batch.name,
    }));
  }

  async resolveStudents(studentProfileIds: readonly string[]): Promise<ResolvedStudentProfile[]> {
    if (studentProfileIds.length === 0) return [];
    const rows = await this.prisma.studentPublicProfile.findMany({
      where: { studentProfileId: { in: [...studentProfileIds] } },
      select: {
        studentProfileId: true,
        bio: true,
        skills: true,
        software: true,
        portfolioLinks: true,
        studentProfile: { select: { fullName: true, batch: { select: { name: true } }, user: { select: { avatarFileId: true } } } },
      },
    });
    return rows.map((row) => ({
      studentProfileId: row.studentProfileId,
      fullName: row.studentProfile.fullName,
      batchName: row.studentProfile.batch.name,
      bio: row.bio,
      skills: row.skills,
      software: row.software,
      portfolioLinks: row.portfolioLinks,
      photoFileId: row.studentProfile.user.avatarFileId,
    }));
  }

  async listSelectableCompanies(): Promise<SelectableCompanyOption[]> {
    const rows = await this.prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({ companyId: row.id, name: row.name }));
  }

  async resolveCompanies(companyIds: readonly string[]): Promise<ResolvedCompany[]> {
    if (companyIds.length === 0) return [];
    const rows = await this.prisma.company.findMany({
      where: { id: { in: [...companyIds] } },
      select: { id: true, name: true, sector: true, logoFileId: true },
    });
    return rows.map((row) => ({
      companyId: row.id,
      name: row.name,
      sector: row.sector,
      logoFileId: row.logoFileId,
    }));
  }

  async listSelectableAlumni(): Promise<SelectableAlumniOption[]> {
    const rows = await this.prisma.alumniProfile.findMany({
      select: { id: true, fullName: true, graduationYear: true },
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
    });
    return rows.map((row) => ({ alumniProfileId: row.id, fullName: row.fullName, graduationYear: row.graduationYear }));
  }

  async resolveAlumni(alumniProfileIds: readonly string[]): Promise<ResolvedAlumniProfile[]> {
    if (alumniProfileIds.length === 0) return [];
    const rows = await this.prisma.alumniProfile.findMany({ where: { id: { in: [...alumniProfileIds] } } });
    return rows.map((row) => ({
      alumniProfileId: row.id,
      fullName: row.fullName,
      graduationYear: row.graduationYear,
      currentCompany: row.currentCompany,
      designation: row.designation,
      location: row.location,
    }));
  }

  async computeStats(): Promise<ResolvedStats> {
    const [totalApplications, totalOffers, totalPlaced, totalDrives, totalCompanies] = await Promise.all([
      this.prisma.application.count(),
      this.prisma.application.count({ where: { currentStatus: { in: [...OFFER_OR_BETTER_STATUSES] } } }),
      this.prisma.application.count({ where: { currentStatus: { in: [...PLACED_STATUSES] } } }),
      this.prisma.placementDrive.count({ where: { status: { not: "DRAFT" } } }),
      this.prisma.company.count({ where: { isActive: true } }),
    ]);
    return { totalApplications, totalOffers, totalPlaced, totalDrives, totalCompanies };
  }
}
