import { Prisma, type MaintenanceIssue as PrismaMaintenanceIssue, type PrismaClient } from "@prisma/client";
import type {
  MaintenanceIssueFilters,
  MaintenanceIssueRecord,
  MaintenanceIssueSort,
  MaintenanceIssueStatus,
  PaginatedResult,
  PaginationInput,
} from "../domain/entities";
import type {
  CreateMaintenanceIssueData,
  DashboardStats,
  MaintenanceIssueRepository,
  UpdateMaintenanceIssueData,
} from "../application/ports/maintenance-issue-repository";

const RESOLVED_LIKE_STATUSES: MaintenanceIssueStatus[] = ["RESOLVED", "VERIFIED", "CLOSED"];

export class PrismaMaintenanceIssueRepository implements MaintenanceIssueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateMaintenanceIssueData): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.create({
      data: {
        category: data.category,
        location: data.location,
        description: data.description,
        priority: data.priority ?? "MEDIUM",
        requesterId: data.requesterId,
        publicReporterName: data.publicReporterName,
        publicReporterEmail: data.publicReporterEmail,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<MaintenanceIssueRecord | null> {
    const row = await this.prisma.maintenanceIssue.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateMaintenanceIssueData): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({
      where: { id },
      data: { priority: data.priority, deadline: data.deadline, description: data.description },
    });
    return toDomain(row);
  }

  async acknowledge(id: string): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
    return toDomain(row);
  }

  async assign(id: string, assigneeId: string, taskId: string, deadline: Date | null): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({
      where: { id },
      data: { status: "ASSIGNED", assigneeId, taskId, deadline },
    });
    return toDomain(row);
  }

  async reassign(id: string, assigneeId: string): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({ where: { id }, data: { assigneeId } });
    return toDomain(row);
  }

  async setStatus(id: string, status: MaintenanceIssueStatus): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({ where: { id }, data: { status } });
    return toDomain(row);
  }

  async resolve(id: string, resolutionDetails: string): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({
      where: { id },
      data: { status: "RESOLVED", resolutionDetails, resolvedAt: new Date() },
    });
    return toDomain(row);
  }

  async reopen(id: string): Promise<MaintenanceIssueRecord> {
    const row = await this.prisma.maintenanceIssue.update({ where: { id }, data: { status: "REOPENED" } });
    return toDomain(row);
  }

  async search(
    filters: MaintenanceIssueFilters,
    sort: MaintenanceIssueSort,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<MaintenanceIssueRecord>> {
    const now = new Date();
    const where: Prisma.MaintenanceIssueWhereInput = {
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
      requesterId: filters.requesterId,
      assigneeId: filters.assigneeId,
      location: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      ...(filters.overdueOnly
        ? { deadline: { lt: now }, status: { notIn: RESOLVED_LIKE_STATUSES } }
        : {}),
    };

    const orderBy: Prisma.MaintenanceIssueOrderByWithRelationInput =
      sort.field === "priority" ? { priority: sort.direction } : { [sort.field]: sort.direction };

    const [rows, total] = await Promise.all([
      this.prisma.maintenanceIssue.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.maintenanceIssue.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }

  /** §3.9 — computed over the full issue set; a department's realistic issue volume makes fetching-and-aggregating in JS simpler (and just as correct) than hand-rolled SQL aggregation. */
  async getDashboardStats(): Promise<DashboardStats> {
    const rows = await this.prisma.maintenanceIssue.findMany({
      select: {
        status: true,
        priority: true,
        category: true,
        location: true,
        deadline: true,
        assigneeId: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
      },
    });

    const now = Date.now();
    const resolvedLike = new Set(RESOLVED_LIKE_STATUSES);
    const openIssues = rows.filter((r) => !resolvedLike.has(r.status));

    const responseTimes = rows.filter((r) => r.acknowledgedAt).map((r) => r.acknowledgedAt!.getTime() - r.createdAt.getTime());
    const resolutionTimes = rows.filter((r) => r.resolvedAt).map((r) => r.resolvedAt!.getTime() - r.createdAt.getTime());

    const byCategory: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    const coordinatorWorkload: Record<string, number> = {};
    for (const r of rows) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      byLocation[r.location] = (byLocation[r.location] ?? 0) + 1;
    }
    for (const r of openIssues) {
      if (r.assigneeId) coordinatorWorkload[r.assigneeId] = (coordinatorWorkload[r.assigneeId] ?? 0) + 1;
    }

    const recurringLocations = Object.entries(byLocation)
      .filter(([, count]) => count >= 3)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    // Escalation lives entirely on the linked Task (see this module's own
    // top-level doc comment) — read via the same polymorphic
    // relatedEntityType/relatedEntityId link Task Engine already exposes,
    // not a duplicated escalation flag on MaintenanceIssue itself.
    const escalatedCount = await this.prisma.task.count({
      where: { relatedEntityType: "MaintenanceIssue", escalatedAt: { not: null } },
    });

    return {
      open: openIssues.length,
      critical: openIssues.filter((r) => r.priority === "URGENT").length,
      overdue: openIssues.filter((r) => r.deadline && r.deadline.getTime() < now).length,
      assigned: rows.filter((r) => r.status === "ASSIGNED").length,
      inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
      resolved: rows.filter((r) => resolvedLike.has(r.status)).length,
      averageResponseTimeMs: responseTimes.length ? average(responseTimes) : null,
      averageResolutionTimeMs: resolutionTimes.length ? average(resolutionTimes) : null,
      byCategory,
      byLocation,
      recurringLocations,
      escalatedCount,
      coordinatorWorkload,
    };
  }
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function toDomain(row: PrismaMaintenanceIssue): MaintenanceIssueRecord {
  return {
    id: row.id,
    category: row.category,
    location: row.location,
    description: row.description,
    priority: row.priority,
    status: row.status,
    requesterId: row.requesterId,
    publicReporterName: row.publicReporterName,
    publicReporterEmail: row.publicReporterEmail,
    assigneeId: row.assigneeId,
    deadline: row.deadline,
    taskId: row.taskId,
    resolutionDetails: row.resolutionDetails,
    acknowledgedAt: row.acknowledgedAt,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
