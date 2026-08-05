import crypto from "node:crypto";
import type { Batch, BatchStatus } from "../../../src/modules/batches/domain/entities";
import type { BatchRepository } from "../../../src/modules/batches/application/ports/batch-repository";

export class InMemoryBatchRepository implements BatchRepository {
  private readonly byId = new Map<string, Batch>();

  seed(batch: Batch): void {
    this.byId.set(batch.id, batch);
  }

  async create(data: { name: string; year: number }): Promise<Batch> {
    const now = new Date();
    const batch: Batch = {
      id: crypto.randomUUID(),
      name: data.name,
      year: data.year,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(batch.id, batch);
    return batch;
  }

  async findById(id: string): Promise<Batch | null> {
    return this.byId.get(id) ?? null;
  }

  async list(filter?: { ids?: readonly string[] }): Promise<Batch[]> {
    const all = [...this.byId.values()];
    if (!filter?.ids) return all;
    const idSet = new Set(filter.ids);
    return all.filter((b) => idSet.has(b.id));
  }

  async update(id: string, data: { name?: string; year?: number }): Promise<Batch> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: Batch = {
      ...existing,
      name: data.name ?? existing.name,
      year: data.year ?? existing.year,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: BatchStatus): Promise<Batch> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: Batch = { ...existing, status, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }
}
