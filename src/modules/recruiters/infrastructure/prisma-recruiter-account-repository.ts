import type { Prisma, PrismaClient } from "@prisma/client";
import type { RecruiterAccountRecord, RecruiterAccountSearchFilters, RecruiterApprovalStatus } from "../domain/entities";
import type {
  CreateRecruiterAccountData,
  RecruiterAccountRepository,
  UpdateRecruiterAccountData,
} from "../application/ports/recruiter-account-repository";

type RecruiterProfileWithUser = Prisma.RecruiterProfileGetPayload<{ include: { user: true } }>;

export class PrismaRecruiterAccountRepository implements RecruiterAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateRecruiterAccountData): Promise<RecruiterAccountRecord> {
    const row = await this.prisma.recruiterProfile.create({
      data: {
        userId: data.userId,
        fullName: data.fullName,
        companyName: data.companyName,
        approvalStatus: data.approvalStatus,
      },
      include: { user: true },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<RecruiterAccountRecord | null> {
    const row = await this.prisma.recruiterProfile.findUnique({ where: { id }, include: { user: true } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateRecruiterAccountData): Promise<RecruiterAccountRecord> {
    const row = await this.prisma.recruiterProfile.update({
      where: { id },
      data: { fullName: data.fullName, companyName: data.companyName },
      include: { user: true },
    });
    return toDomain(row);
  }

  async setActive(id: string, isActive: boolean): Promise<RecruiterAccountRecord> {
    // Mirrors PrismaStudentRepository.setActive / PrismaCoordinatorRepository.setActive.
    const [row] = await this.prisma.$transaction([
      this.prisma.recruiterProfile.update({ where: { id }, data: { isActive }, include: { user: true } }),
      this.prisma.user.updateMany({ where: { recruiterProfile: { id } }, data: { isActive } }),
    ]);
    return toDomain(row);
  }

  async setApprovalStatus(id: string, status: RecruiterApprovalStatus): Promise<RecruiterAccountRecord> {
    const row = await this.prisma.recruiterProfile.update({
      where: { id },
      data: { approvalStatus: status },
      include: { user: true },
    });
    return toDomain(row);
  }

  async approveAndActivate(id: string): Promise<RecruiterAccountRecord> {
    // Mirrors setActive's own transaction shape.
    const [row] = await this.prisma.$transaction([
      this.prisma.recruiterProfile.update({
        where: { id },
        data: { approvalStatus: "APPROVED" },
        include: { user: true },
      }),
      this.prisma.user.updateMany({ where: { recruiterProfile: { id } }, data: { isActive: true } }),
    ]);
    return toDomain(row);
  }

  async search(filters: RecruiterAccountSearchFilters): Promise<RecruiterAccountRecord[]> {
    const where: Prisma.RecruiterProfileWhereInput = {
      isActive: filters.includeInactive ? undefined : true,
      fullName: filters.name ? { contains: filters.name, mode: "insensitive" } : undefined,
      companyName: filters.companyName ? { contains: filters.companyName, mode: "insensitive" } : undefined,
      approvalStatus: filters.approvalStatus,
      user: filters.email ? { email: { contains: filters.email, mode: "insensitive" } } : undefined,
    };

    const rows = await this.prisma.recruiterProfile.findMany({
      where,
      include: { user: true },
      orderBy: { fullName: "asc" },
    });

    return rows.map(toDomain);
  }
}

function toDomain(row: RecruiterProfileWithUser): RecruiterAccountRecord {
  return {
    id: row.id,
    userId: row.userId,
    email: row.user.email,
    fullName: row.fullName,
    companyName: row.companyName,
    isActive: row.isActive,
    approvalStatus: row.approvalStatus,
    createdAt: row.user.createdAt,
  };
}
