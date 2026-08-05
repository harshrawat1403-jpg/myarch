import type { PrismaClient, Batch as PrismaBatch } from "@prisma/client";
import type { Batch, BatchStatus } from "../domain/entities";
import type { BatchRepository } from "../application/ports/batch-repository";

export class PrismaBatchRepository implements BatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: { name: string; year: number }): Promise<Batch> {
    const row = await this.prisma.batch.create({ data });
    return toDomain(row);
  }

  async findById(id: string): Promise<Batch | null> {
    const row = await this.prisma.batch.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async list(filter?: { ids?: readonly string[] }): Promise<Batch[]> {
    const rows = await this.prisma.batch.findMany({
      where: filter?.ids ? { id: { in: [...filter.ids] } } : undefined,
      orderBy: { year: "desc" },
    });
    return rows.map(toDomain);
  }

  async update(id: string, data: { name?: string; year?: number }): Promise<Batch> {
    const row = await this.prisma.batch.update({ where: { id }, data });
    return toDomain(row);
  }

  async updateStatus(id: string, status: BatchStatus): Promise<Batch> {
    const row = await this.prisma.batch.update({ where: { id }, data: { status } });
    return toDomain(row);
  }
}

function toDomain(row: PrismaBatch): Batch {
  return {
    id: row.id,
    name: row.name,
    year: row.year,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
