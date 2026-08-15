import type { Prisma, PrismaClient } from "@prisma/client";
import type { CoordinatorRecord, CoordinatorSearchFilters, MaintenanceCoordinatorRole } from "../domain/entities";
import type {
  CoordinatorRepository,
  CreateCoordinatorData,
  UpdateCoordinatorData,
} from "../application/ports/coordinator-repository";

type CoordinatorProfileWithUser = Prisma.CoordinatorProfileGetPayload<{
  include: { user: true; batchScopes: true };
}>;

export class PrismaCoordinatorRepository implements CoordinatorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCoordinatorData): Promise<CoordinatorRecord> {
    const row = await this.prisma.coordinatorProfile.create({
      data: { userId: data.userId, fullName: data.fullName, position: data.position },
      include: { user: true, batchScopes: true },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<CoordinatorRecord | null> {
    const row = await this.prisma.coordinatorProfile.findUnique({
      where: { id },
      include: { user: true, batchScopes: true },
    });
    return row ? toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<CoordinatorRecord | null> {
    const row = await this.prisma.coordinatorProfile.findUnique({
      where: { userId },
      include: { user: true, batchScopes: true },
    });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateCoordinatorData): Promise<CoordinatorRecord> {
    const row = await this.prisma.coordinatorProfile.update({
      where: { id },
      data: { fullName: data.fullName, position: data.position },
      include: { user: true, batchScopes: true },
    });
    return toDomain(row);
  }

  async setActive(id: string, isActive: boolean): Promise<CoordinatorRecord> {
    // Mirrors PrismaStudentRepository.setActive: the roster record and the
    // login flip together in one transaction.
    const [row] = await this.prisma.$transaction([
      this.prisma.coordinatorProfile.update({
        where: { id },
        data: { isActive },
        include: { user: true, batchScopes: true },
      }),
      this.prisma.user.updateMany({
        where: { coordinatorProfile: { id } },
        data: { isActive },
      }),
    ]);
    return toDomain(row);
  }

  async countActive(): Promise<number> {
    return this.prisma.coordinatorProfile.count({ where: { isActive: true } });
  }

  async setPermissions(id: string, permissions: readonly string[]): Promise<CoordinatorRecord> {
    const row = await this.prisma.coordinatorProfile.update({
      where: { id },
      data: { permissions: [...permissions] },
      include: { user: true, batchScopes: true },
    });
    return toDomain(row);
  }

  async setMaintenanceRole(id: string, maintenanceRole: MaintenanceCoordinatorRole | null): Promise<CoordinatorRecord> {
    const row = await this.prisma.coordinatorProfile.update({
      where: { id },
      data: { maintenanceRole },
      include: { user: true, batchScopes: true },
    });
    return toDomain(row);
  }

  async countActiveByMaintenanceRole(role: MaintenanceCoordinatorRole, excludingId?: string): Promise<number> {
    return this.prisma.coordinatorProfile.count({
      where: { maintenanceRole: role, isActive: true, id: excludingId ? { not: excludingId } : undefined },
    });
  }

  async findActiveByMaintenanceRole(role: MaintenanceCoordinatorRole): Promise<CoordinatorRecord | null> {
    const row = await this.prisma.coordinatorProfile.findFirst({
      where: { maintenanceRole: role, isActive: true },
      include: { user: true, batchScopes: true },
    });
    return row ? toDomain(row) : null;
  }

  async search(filters: CoordinatorSearchFilters): Promise<CoordinatorRecord[]> {
    const where: Prisma.CoordinatorProfileWhereInput = {
      isActive: filters.includeInactive ? undefined : true,
      fullName: filters.name ? { contains: filters.name, mode: "insensitive" } : undefined,
      user: filters.email ? { email: { contains: filters.email, mode: "insensitive" } } : undefined,
      position: filters.position,
    };

    const rows = await this.prisma.coordinatorProfile.findMany({
      where,
      include: { user: true, batchScopes: true },
      orderBy: { fullName: "asc" },
    });

    return rows.map(toDomain);
  }

  async assignBatch(id: string, batchId: string): Promise<CoordinatorRecord> {
    await this.prisma.coordinatorBatchScope.create({
      data: { coordinatorProfileId: id, batchId },
    });
    return (await this.findById(id))!;
  }

  async removeBatch(id: string, batchId: string): Promise<CoordinatorRecord> {
    await this.prisma.coordinatorBatchScope.deleteMany({
      where: { coordinatorProfileId: id, batchId },
    });
    return (await this.findById(id))!;
  }
}

function toDomain(row: CoordinatorProfileWithUser): CoordinatorRecord {
  return {
    id: row.id,
    userId: row.userId,
    email: row.user.email,
    fullName: row.fullName,
    isActive: row.isActive,
    position: row.position,
    batchIds: row.batchScopes.map((scope) => scope.batchId),
    permissions: row.permissions,
    maintenanceRole: row.maintenanceRole,
    createdAt: row.user.createdAt,
  };
}
