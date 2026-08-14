import { Prisma, type Request as PrismaRequest, type PrismaClient } from "@prisma/client";
import type {
  PaginatedResult,
  PaginationInput,
  RequestDecision,
  RequestFilters,
  RequestRecord,
  RequestSort,
  RequestStatus,
} from "../domain/entities";
import type { CreateRequestData, RequestRepository, UpdateRequestData } from "../application/ports/request-repository";

export class PrismaRequestRepository implements RequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateRequestData): Promise<RequestRecord> {
    const row = await this.prisma.request.create({
      data: {
        type: data.type,
        description: data.description,
        priority: data.priority ?? "MEDIUM",
        requesterId: data.requesterId,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<RequestRecord | null> {
    const row = await this.prisma.request.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateRequestData): Promise<RequestRecord> {
    const row = await this.prisma.request.update({
      where: { id },
      data: { priority: data.priority, deadline: data.deadline, description: data.description },
    });
    return toDomain(row);
  }

  async startReview(id: string): Promise<RequestRecord> {
    const row = await this.prisma.request.update({ where: { id }, data: { status: "REVIEW" } });
    return toDomain(row);
  }

  async decide(id: string, decision: RequestDecision, decisionReason: string | null): Promise<RequestRecord> {
    const row = await this.prisma.request.update({
      where: { id },
      data: {
        decision,
        decisionReason,
        decidedAt: new Date(),
        status: decision === "REJECTED" ? "CLOSED" : undefined,
      },
    });
    return toDomain(row);
  }

  async assign(id: string, ownerId: string, taskId: string, deadline: Date | null): Promise<RequestRecord> {
    const row = await this.prisma.request.update({
      where: { id },
      data: { status: "ASSIGNED", ownerId, taskId, deadline },
    });
    return toDomain(row);
  }

  async reassign(id: string, ownerId: string): Promise<RequestRecord> {
    const row = await this.prisma.request.update({ where: { id }, data: { ownerId } });
    return toDomain(row);
  }

  async setStatus(id: string, status: RequestStatus): Promise<RequestRecord> {
    const row = await this.prisma.request.update({ where: { id }, data: { status } });
    return toDomain(row);
  }

  async search(filters: RequestFilters, sort: RequestSort, pagination: PaginationInput): Promise<PaginatedResult<RequestRecord>> {
    const now = new Date();
    const OPEN_STATUSES: RequestStatus[] = ["SUBMITTED", "REVIEW", "ASSIGNED", "IN_PROGRESS"];
    const where: Prisma.RequestWhereInput = {
      status: filters.status,
      type: filters.type,
      priority: filters.priority,
      requesterId: filters.requesterId,
      ownerId: filters.ownerId,
      description: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      ...(filters.overdueOnly ? { deadline: { lt: now }, status: { in: OPEN_STATUSES } } : {}),
    };

    const orderBy: Prisma.RequestOrderByWithRelationInput =
      sort.field === "priority" ? { priority: sort.direction } : { [sort.field]: sort.direction };

    const [rows, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.request.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

function toDomain(row: PrismaRequest): RequestRecord {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    priority: row.priority,
    status: row.status,
    requesterId: row.requesterId,
    ownerId: row.ownerId,
    deadline: row.deadline,
    taskId: row.taskId,
    decision: row.decision,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
