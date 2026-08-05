import type { Batch, BatchStatus } from "../../domain/entities";

export interface BatchRepository {
  create(data: { name: string; year: number }): Promise<Batch>;
  findById(id: string): Promise<Batch | null>;
  /** Optionally restricted to a specific set of batch IDs (Coordinator scope). */
  list(filter?: { ids?: readonly string[] }): Promise<Batch[]>;
  update(id: string, data: { name?: string; year?: number }): Promise<Batch>;
  updateStatus(id: string, status: BatchStatus): Promise<Batch>;
}
