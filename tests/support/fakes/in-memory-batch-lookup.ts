import type { BatchStatus } from "../../../src/modules/batches";
import type { BatchLookup } from "../../../src/lib/batch-lookup";

export class InMemoryBatchLookup implements BatchLookup {
  private readonly byId = new Map<string, { id: string; status: BatchStatus }>();

  seed(id: string, status: BatchStatus): void {
    this.byId.set(id, { id, status });
  }

  async findById(id: string): Promise<{ id: string; status: BatchStatus } | null> {
    return this.byId.get(id) ?? null;
  }
}
