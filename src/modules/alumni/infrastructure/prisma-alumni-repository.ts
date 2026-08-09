import { Prisma, type AlumniProfile as PrismaAlumniProfile, type PrismaClient } from "@prisma/client";
import type { AlumniRecord, AlumniSearchFilters } from "../domain/entities";
import type { AlumniRepository, CreateAlumniData, UpdateAlumniData } from "../application/ports/alumni-repository";
import { DuplicateAlumniLinkError, StudentProfileNotFoundError } from "../domain/errors";

export class PrismaAlumniRepository implements AlumniRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAlumniData): Promise<AlumniRecord> {
    try {
      const row = await this.prisma.alumniProfile.create({
        data: {
          studentProfileId: data.studentProfileId ?? null,
          fullName: data.fullName,
          graduationYear: data.graduationYear,
          currentCompany: data.currentCompany ?? null,
          designation: data.designation ?? null,
          location: data.location ?? null,
          portfolioUrl: data.portfolioUrl ?? null,
          linkedInUrl: data.linkedInUrl ?? null,
          mentorshipAvailable: data.mentorshipAvailable ?? false,
        },
      });
      return toDomain(row);
    } catch (err) {
      throw translatePrismaError(err);
    }
  }

  async findById(id: string): Promise<AlumniRecord | null> {
    const row = await this.prisma.alumniProfile.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateAlumniData): Promise<AlumniRecord> {
    try {
      const row = await this.prisma.alumniProfile.update({
        where: { id },
        data: {
          fullName: data.fullName,
          graduationYear: data.graduationYear,
          currentCompany: data.currentCompany,
          designation: data.designation,
          location: data.location,
          portfolioUrl: data.portfolioUrl,
          linkedInUrl: data.linkedInUrl,
          mentorshipAvailable: data.mentorshipAvailable,
        },
      });
      return toDomain(row);
    } catch (err) {
      throw translatePrismaError(err);
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.alumniProfile.delete({ where: { id } }).catch(() => {
      // Already gone — deleting a stale reference is a no-op, matching this codebase's established convention (e.g. avatar/certificate file cleanup).
    });
  }

  async search(filters: AlumniSearchFilters): Promise<AlumniRecord[]> {
    const where: Prisma.AlumniProfileWhereInput = {
      fullName: filters.name ? { contains: filters.name, mode: "insensitive" } : undefined,
      graduationYear: filters.graduationYear,
      mentorshipAvailable: filters.mentorshipAvailable,
    };

    const rows = await this.prisma.alumniProfile.findMany({
      where,
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
    });
    return rows.map(toDomain);
  }
}

function translatePrismaError(err: unknown): Error {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") return new StudentProfileNotFoundError();
    if (err.code === "P2002") return new DuplicateAlumniLinkError();
  }
  return err as Error;
}

function toDomain(row: PrismaAlumniProfile): AlumniRecord {
  return {
    id: row.id,
    studentProfileId: row.studentProfileId,
    fullName: row.fullName,
    graduationYear: row.graduationYear,
    currentCompany: row.currentCompany,
    designation: row.designation,
    location: row.location,
    portfolioUrl: row.portfolioUrl,
    linkedInUrl: row.linkedInUrl,
    mentorshipAvailable: row.mentorshipAvailable,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
