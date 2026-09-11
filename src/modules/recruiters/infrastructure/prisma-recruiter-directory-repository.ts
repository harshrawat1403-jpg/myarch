import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  RecruiterDashboardStats,
  RecruiterSearchFilters,
  RecruiterStudentProfileDTO,
  ResumeReference,
} from "../domain/entities";
import type { RecruiterDirectoryRepository } from "../application/ports/recruiter-directory-repository";

type ApprovedProfileRow = Prisma.StudentPublicProfileGetPayload<{
  include: { studentProfile: { include: { batch: true; user: true } }; portfolioImages: true };
}>;

/**
 * Every query here is rooted at StudentPublicProfile, never
 * StudentPrivateProfile or StudentPublicProfileDraft. This is deliberate,
 * structural, and not merely a convention to remember: a student who has
 * never been approved (still DRAFT, PENDING_REVIEW, or CHANGES_REQUESTED)
 * has NO row in StudentPublicProfile at all — it is only ever written by
 * ApproveDraftUseCase's publish step (docs/architecture/05_System_Architecture.md).
 * Querying this table as the root therefore makes "only approved profiles
 * are visible" true by construction, not by a filter someone could forget.
 *
 * Additionally scoped to `studentProfile.isActive` (excludes archived
 * students) and `studentProfile.batch.status === "ACTIVE"` (excludes
 * graduated/archived batches — see this phase's implementation summary for
 * why graduated batches are excluded from the default recruiter view).
 */
export class PrismaRecruiterDirectoryRepository implements RecruiterDirectoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async search(filters: RecruiterSearchFilters): Promise<RecruiterStudentProfileDTO[]> {
    const and: Prisma.StudentPublicProfileWhereInput[] = [
      { studentProfile: { isActive: true, batch: { status: "ACTIVE" } } },
    ];

    if (filters.batchId) {
      and.push({ studentProfile: { batchId: filters.batchId } });
    }
    if (filters.skills && filters.skills.length > 0) {
      and.push({ skills: { hasSome: [...filters.skills] } });
    }
    if (filters.software && filters.software.length > 0) {
      and.push({ software: { hasSome: [...filters.software] } });
    }

    const rows = await this.prisma.studentPublicProfile.findMany({
      where: { AND: and },
      include: { studentProfile: { include: { batch: true, user: true } }, portfolioImages: { orderBy: { sortOrder: "asc" } } },
    });

    const dtos = rows.map(toDTO).sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Free-text search and JSON-field keyword/boolean filters are applied
    // in-application rather than as Prisma where-clauses: skills/software
    // are native Postgres arrays (Prisma's `hasSome` supports those
    // cleanly), but certifications/internships are stored as JSON and a
    // case-insensitive partial-text match across them is not something
    // Prisma's JSON filtering expresses cleanly or reliably across
    // providers. At this project's scale (docs/04_Non_Functional_Requirements.md's
    // low-hundreds-per-batch assumption) filtering an already-narrowed,
    // already-fetched result set in memory is simple, correct, and easy to
    // unit test — the same pragmatic tradeoff this codebase has made before.
    return dtos.filter((dto) => matchesTextFilters(dto, filters));
  }

  async findByStudentId(studentId: string): Promise<RecruiterStudentProfileDTO | null> {
    const row = await this.prisma.studentPublicProfile.findFirst({
      where: {
        studentProfileId: studentId,
        studentProfile: { isActive: true, batch: { status: "ACTIVE" } },
      },
      include: { studentProfile: { include: { batch: true, user: true } }, portfolioImages: { orderBy: { sortOrder: "asc" } } },
    });

    return row ? toDTO(row) : null;
  }

  async findManyByIds(studentIds: readonly string[]): Promise<RecruiterStudentProfileDTO[]> {
    if (studentIds.length === 0) return [];
    const rows = await this.prisma.studentPublicProfile.findMany({
      where: {
        studentProfileId: { in: [...studentIds] },
        studentProfile: { isActive: true, batch: { status: "ACTIVE" } },
      },
      include: { studentProfile: { include: { batch: true, user: true } }, portfolioImages: { orderBy: { sortOrder: "asc" } } },
    });
    return rows.map(toDTO).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async getDashboardStats(): Promise<RecruiterDashboardStats> {
    const rows = await this.prisma.studentPublicProfile.findMany({
      where: { studentProfile: { isActive: true, batch: { status: "ACTIVE" } } },
      select: { skills: true, studentProfile: { select: { batchId: true } } },
    });

    const batchIds = new Set<string>();
    const skillSet = new Set<string>();
    for (const row of rows) {
      batchIds.add(row.studentProfile.batchId);
      for (const skill of row.skills) skillSet.add(skill);
    }

    return {
      totalAvailableStudents: rows.length,
      graduationBatchesAvailable: batchIds.size,
      skillsRepresented: skillSet.size,
    };
  }

  async getResumeReference(studentId: string): Promise<ResumeReference | null> {
    const row = await this.prisma.studentPublicProfile.findFirst({
      where: {
        studentProfileId: studentId,
        studentProfile: { isActive: true, batch: { status: "ACTIVE" } },
      },
      include: { resumeFile: true },
    });

    // Defense in depth: even if resumeFileId somehow pointed at a
    // non-public asset, this repository still refuses to hand it back —
    // "recruiters may download ONLY the approved public resume."
    if (!row?.resumeFile || row.resumeFile.classification !== "PUBLIC") {
      return null;
    }

    return { storageKey: row.resumeFile.storageKey, mimeType: row.resumeFile.mimeType };
  }
}

/**
 * Explicit, field-by-field mapping — never `...row` or `...row.studentProfile`.
 * See domain/entities.ts's doc comment: this function is the one place a
 * developer must deliberately touch for any new StudentPublicProfile column
 * to ever reach a recruiter.
 */
/**
 * Exported (not just module-private) specifically so a regression test can
 * feed it a row shaped like what a future, careless join might produce —
 * e.g. one that also carries private-profile-shaped fields — and assert
 * the returned DTO's own keys never include them, regardless of what the
 * input contained. See tests/unit/recruiters/dto-whitelist.test.ts.
 */
export function toDTO(row: ApprovedProfileRow): RecruiterStudentProfileDTO {
  return {
    studentId: row.studentProfileId,
    fullName: row.studentProfile.fullName,
    batchId: row.studentProfile.batchId,
    batchName: row.studentProfile.batch.name,
    bio: row.bio,
    skills: row.skills,
    software: row.software,
    selectedProjects: row.selectedProjects as unknown as RecruiterStudentProfileDTO["selectedProjects"],
    portfolioLinks: row.portfolioLinks,
    portfolioImages: (row.portfolioImages ?? []).map((image) => ({ id: image.id, fileId: image.fileId, title: image.title, caption: image.caption, sortOrder: image.sortOrder })),
    certifications: row.certifications as unknown as RecruiterStudentProfileDTO["certifications"],
    internships: row.internships as unknown as RecruiterStudentProfileDTO["internships"],
    hasResume: row.resumeFileId !== null,
    profilePhotoUrl: row.studentProfile.user.avatarFileId ? `/api/files/${row.studentProfile.user.avatarFileId}` : null,
    // Merged in afterward by the use-case layer, which knows which recruiter
    // is asking — this repository has no actor context (see
    // RecruiterInteractionRepository in the same module for that lookup).
    isSaved: false,
    isShortlisted: false,
    interestStatus: null,
  };
}

function matchesTextFilters(
  dto: RecruiterStudentProfileDTO,
  filters: RecruiterSearchFilters,
): boolean {
  if (filters.hasInternshipExperience && dto.internships.length === 0) return false;
  if (filters.hasCertification && dto.certifications.length === 0) return false;

  if (filters.internshipKeyword) {
    const needle = filters.internshipKeyword.toLowerCase();
    const matches = dto.internships.some((entry) =>
      [entry.company, entry.role, entry.duration].some((field) => field?.toLowerCase().includes(needle)),
    );
    if (!matches) return false;
  }

  if (filters.certificationKeyword) {
    const needle = filters.certificationKeyword.toLowerCase();
    const matches = dto.certifications.some((entry) =>
      [entry.title, entry.issuer].some((field) => field?.toLowerCase().includes(needle)),
    );
    if (!matches) return false;
  }

  if (filters.query) {
    const needle = filters.query.toLowerCase();
    const haystacks = [
      dto.fullName,
      dto.bio ?? "",
      ...dto.skills,
      ...dto.software,
      ...dto.certifications.map((c) => c.title),
      ...dto.internships.map((i) => i.company),
    ];
    const matches = haystacks.some((field) => field.toLowerCase().includes(needle));
    if (!matches) return false;
  }

  return true;
}
