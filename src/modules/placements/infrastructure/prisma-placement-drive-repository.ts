import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreatePlacementDriveData,
  DriveEligibility,
  PlacementDriveRecord,
  PlacementDriveSearchFilters,
  PlacementDriveStatus,
  UpdatePlacementDriveData,
} from "../domain/entities";
import type { PlacementDriveRepository } from "../application/ports/placement-drive-repository";

type DriveRow = Prisma.PlacementDriveGetPayload<{ include: { company: { select: { name: true } } } }>;

export class PrismaPlacementDriveRepository implements PlacementDriveRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreatePlacementDriveData): Promise<PlacementDriveRecord> {
    const row = await this.prisma.placementDrive.create({
      data: {
        companyId: data.companyId,
        title: data.title,
        type: data.type,
        eligibility: data.eligibility as unknown as Prisma.InputJsonValue,
        packageOrStipend: data.packageOrStipend ?? null,
        description: data.description ?? null,
        applicationDeadline: data.applicationDeadline ?? null,
        createdByUserId: data.createdByUserId,
      },
      include: { company: { select: { name: true } } },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<PlacementDriveRecord | null> {
    const row = await this.prisma.placementDrive.findUnique({
      where: { id },
      include: { company: { select: { name: true } } },
    });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdatePlacementDriveData): Promise<PlacementDriveRecord> {
    const row = await this.prisma.placementDrive.update({
      where: { id },
      data: {
        title: data.title,
        eligibility: data.eligibility !== undefined ? (data.eligibility as unknown as Prisma.InputJsonValue) : undefined,
        packageOrStipend: data.packageOrStipend,
        description: data.description,
        applicationDeadline: data.applicationDeadline,
      },
      include: { company: { select: { name: true } } },
    });
    return toDomain(row);
  }

  async setStatus(id: string, status: PlacementDriveStatus): Promise<PlacementDriveRecord> {
    const row = await this.prisma.placementDrive.update({
      where: { id },
      data: { status },
      include: { company: { select: { name: true } } },
    });
    return toDomain(row);
  }

  async search(filters: PlacementDriveSearchFilters): Promise<PlacementDriveRecord[]> {
    const where: Prisma.PlacementDriveWhereInput = {
      status: filters.status,
      type: filters.type,
      companyId: filters.companyId,
    };

    const rows = await this.prisma.placementDrive.findMany({
      where,
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }
}

function toDomain(row: DriveRow): PlacementDriveRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    title: row.title,
    type: row.type,
    eligibility: row.eligibility as unknown as DriveEligibility,
    packageOrStipend: row.packageOrStipend,
    description: row.description,
    status: row.status,
    applicationDeadline: row.applicationDeadline,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
