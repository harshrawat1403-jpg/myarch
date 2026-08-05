import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  StudentPrivateFields,
  StudentRecord,
  StudentSearchFilters,
  StudentSearchResultItem,
} from "../domain/entities";
import type {
  CreateStudentData,
  StudentRepository,
  UpdateStudentData,
} from "../application/ports/student-repository";

type StudentProfileWithPrivate = Prisma.StudentProfileGetPayload<{
  include: { privateProfile: true };
}>;

export class PrismaStudentRepository implements StudentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateStudentData): Promise<StudentRecord> {
    const row = await this.prisma.studentProfile.create({
      data: {
        userId: data.userId,
        batchId: data.batchId,
        rollNumber: data.rollNumber,
        fullName: data.fullName,
        privateProfile: {
          create: {
            phone: data.private.phone ?? null,
            personalEmail: data.private.personalEmail ?? null,
            cgpa: data.private.cgpa ?? null,
            hasActiveBacklog: data.private.hasActiveBacklog ?? false,
            backlogDetails: data.private.backlogDetails ?? null,
            internalRemarks: data.private.internalRemarks ?? null,
            updatedByUserId: data.actorUserId,
          },
        },
      },
      include: { privateProfile: true },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<StudentRecord | null> {
    const row = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: { privateProfile: true },
    });
    return row ? toDomain(row) : null;
  }

  async findByRollNumber(rollNumber: string): Promise<StudentRecord | null> {
    const row = await this.prisma.studentProfile.findUnique({
      where: { rollNumber },
      include: { privateProfile: true },
    });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateStudentData): Promise<StudentRecord> {
    const p = data.private;
    const row = await this.prisma.studentProfile.update({
      where: { id },
      data: {
        fullName: data.fullName,
        batchId: data.batchId,
        privateProfile: p
          ? {
              update: {
                phone: p.phone,
                personalEmail: p.personalEmail,
                cgpa: p.cgpa,
                hasActiveBacklog: p.hasActiveBacklog,
                backlogDetails: p.backlogDetails,
                internalRemarks: p.internalRemarks,
                updatedByUserId: data.actorUserId,
              },
            }
          : undefined,
      },
      include: { privateProfile: true },
    });
    return toDomain(row);
  }

  async setActive(id: string, isActive: boolean): Promise<StudentRecord> {
    // Archiving/restoring a student's roster record also flips their login
    // access (User.isActive) in the same transaction, so an archived
    // student can never remain able to log in — see the module's
    // Days 3–4 implementation summary for the reasoning.
    const [row] = await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { id },
        data: { isActive },
        include: { privateProfile: true },
      }),
      this.prisma.user.updateMany({
        where: { studentProfile: { id } },
        data: { isActive },
      }),
    ]);
    return toDomain(row);
  }

  async search(
    filters: StudentSearchFilters,
    scope: { batchIds?: readonly string[] },
  ): Promise<StudentSearchResultItem[]> {
    // Built as an AND array of independent conditions rather than a single
    // object literal — skills and software each need their own `OR` (public
    // profile vs. draft), and a flat object can only hold one `OR` key, so
    // combining both that way would silently drop one of them.
    const and: Prisma.StudentProfileWhereInput[] = [
      { isActive: filters.includeInactive ? undefined : true },
      {
        batchId: filters.batchId
          ? filters.batchId
          : scope.batchIds
            ? { in: [...scope.batchIds] }
            : undefined,
      },
      { fullName: filters.name ? { contains: filters.name, mode: "insensitive" } : undefined },
      {
        rollNumber: filters.rollNumber
          ? { contains: filters.rollNumber, mode: "insensitive" }
          : undefined,
      },
      { batch: filters.batchStatus ? { status: filters.batchStatus } : undefined },
      {
        privateProfile:
          filters.cgpaMin !== undefined || filters.cgpaMax !== undefined
            ? { cgpa: { gte: filters.cgpaMin, lte: filters.cgpaMax } }
            : undefined,
      },
    ];

    if (filters.skills && filters.skills.length > 0) {
      and.push({
        OR: [
          { publicProfile: { skills: { hasSome: [...filters.skills] } } },
          { draft: { skills: { hasSome: [...filters.skills] } } },
        ],
      });
    }

    if (filters.software && filters.software.length > 0) {
      and.push({
        OR: [
          { publicProfile: { software: { hasSome: [...filters.software] } } },
          { draft: { software: { hasSome: [...filters.software] } } },
        ],
      });
    }

    const where: Prisma.StudentProfileWhereInput = { AND: and };

    const rows = await this.prisma.studentProfile.findMany({
      where,
      include: {
        privateProfile: true,
        batch: true,
        publicProfile: true,
        draft: true,
      },
      orderBy: { fullName: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      rollNumber: row.rollNumber,
      fullName: row.fullName,
      batchId: row.batchId,
      batchName: row.batch.name,
      batchStatus: row.batch.status,
      isActive: row.isActive,
      cgpa: row.privateProfile?.cgpa ? row.privateProfile.cgpa.toNumber() : null,
      hasActiveBacklog: row.privateProfile?.hasActiveBacklog ?? false,
      skills: row.publicProfile?.skills ?? row.draft?.skills ?? [],
      software: row.publicProfile?.software ?? row.draft?.software ?? [],
    }));
  }
}

function toDomain(row: StudentProfileWithPrivate): StudentRecord {
  const priv: StudentPrivateFields = {
    phone: row.privateProfile?.phone ?? null,
    personalEmail: row.privateProfile?.personalEmail ?? null,
    cgpa: row.privateProfile?.cgpa ? row.privateProfile.cgpa.toNumber() : null,
    hasActiveBacklog: row.privateProfile?.hasActiveBacklog ?? false,
    backlogDetails: row.privateProfile?.backlogDetails ?? null,
    internalRemarks: row.privateProfile?.internalRemarks ?? null,
  };

  return {
    id: row.id,
    userId: row.userId,
    batchId: row.batchId,
    rollNumber: row.rollNumber,
    fullName: row.fullName,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    private: priv,
  };
}
