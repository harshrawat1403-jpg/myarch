import type { Prisma, PrismaClient } from "@prisma/client";
import type { PublicDirectoryProfile, PublicDirectorySearchFilters } from "../domain/entities";
import type { PublicDirectoryRepository } from "../application/ports/public-directory-repository";

type PublicProfileRow = Prisma.StudentPublicProfileGetPayload<{
  include: {
    studentProfile: {
      include: { batch: true; user: true; privateProfile: { select: { cgpa: true } } };
    }; portfolioImages: true;
  };
}>;

/**
 * Every query is rooted at StudentPublicProfile (never StudentPrivateProfile
 * or StudentPublicProfileDraft) — the same structural guarantee
 * PrismaRecruiterDirectoryRepository already established: a profile that
 * was never approved has no row here at all, so "only approved profiles are
 * visible" is true by construction. Additionally filtered to
 * `isPubliclyDiscoverable: true` (the public-specific gate on top of the
 * recruiter directory's own isActive+batch.status=ACTIVE filters) — the
 * concrete enforcement of §7 step 1 / §18 point 2.
 */
export class PrismaPublicDirectoryRepository implements PublicDirectoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async search(filters: PublicDirectorySearchFilters): Promise<PublicDirectoryProfile[]> {
    const and: Prisma.StudentPublicProfileWhereInput[] = [
      {
        isPubliclyDiscoverable: true,
        studentProfile: { isActive: true, batch: { status: "ACTIVE" } },
      },
    ];

    if (filters.batchId) and.push({ studentProfile: { batchId: filters.batchId } });
    if (filters.skills && filters.skills.length > 0) and.push({ skills: { hasSome: [...filters.skills] } });
    if (filters.software && filters.software.length > 0) and.push({ software: { hasSome: [...filters.software] } });

    const rows = await this.prisma.studentPublicProfile.findMany({
      where: { AND: and },
      include: {
        studentProfile: { include: { batch: true, user: true, privateProfile: { select: { cgpa: true } } } }, portfolioImages: { orderBy: { sortOrder: "asc" } },
      },
    });

    const dtos = rows.map(toDTO).sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Free-text search over already-fetched, already-narrowed rows — the
    // same pragmatic in-application-filter tradeoff PrismaRecruiterDirectoryRepository
    // already makes, for the same reasons (JSON-field text search doesn't
    // express cleanly as a Prisma where-clause, and this project's scale
    // makes in-memory filtering simple and correct).
    if (!filters.query) return dtos;
    const needle = filters.query.toLowerCase();
    return dtos.filter((dto) => {
      const haystacks = [dto.fullName, dto.bio ?? "", ...dto.skills, ...dto.software];
      return haystacks.some((field) => field.toLowerCase().includes(needle));
    });
  }

  async findByStudentId(studentId: string): Promise<PublicDirectoryProfile | null> {
    const row = await this.prisma.studentPublicProfile.findFirst({
      where: {
        studentProfileId: studentId,
        isPubliclyDiscoverable: true,
        studentProfile: { isActive: true, batch: { status: "ACTIVE" } },
      },
      include: {
        studentProfile: { include: { batch: true, user: true, privateProfile: { select: { cgpa: true } } } }, portfolioImages: { orderBy: { sortOrder: "asc" } },
      },
    });
    return row ? toDTO(row) : null;
  }
}

/**
 * Explicit, field-by-field mapping — never `...row`. Exported (not just
 * module-private) so a regression test can feed it a row shaped like what a
 * future, careless join might produce (e.g. one that also carries
 * phone/personalEmail) and assert the returned DTO's own keys never include
 * them, regardless of what the input contained — the same
 * dto-whitelist.test.ts discipline §18.3 requires, applied to this new
 * surface. cgpa is the one field with an additional runtime gate: even
 * though the query joins StudentPrivateProfile.cgpa narrowly (never the
 * rest of that table), this function still only surfaces it when the
 * student's own showCgpa flag is true.
 */
export function toDTO(row: PublicProfileRow): PublicDirectoryProfile {
  return {
    studentId: row.studentProfileId,
    fullName: row.studentProfile.fullName,
    batchId: row.studentProfile.batchId,
    batchName: row.studentProfile.batch.name,
    bio: row.bio,
    skills: row.skills,
    software: row.software,
    selectedProjects: row.selectedProjects as unknown as PublicDirectoryProfile["selectedProjects"],
    portfolioLinks: row.portfolioLinks,
    portfolioImages: (row.portfolioImages ?? []).map((image) => ({ id: image.id, fileId: image.fileId, title: image.title, caption: image.caption, sortOrder: image.sortOrder })),
    certifications: row.certifications as unknown as PublicDirectoryProfile["certifications"],
    internships: row.internships as unknown as PublicDirectoryProfile["internships"],
    hasResume: row.resumeFileId !== null,
    profilePhotoUrl: row.studentProfile.user.avatarFileId ? `/api/files/${row.studentProfile.user.avatarFileId}` : null,
    cgpa: row.showCgpa && row.studentProfile.privateProfile?.cgpa ? row.studentProfile.privateProfile.cgpa.toNumber() : null,
  };
}
