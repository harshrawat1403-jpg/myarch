import type { BatchStatus } from "../../../src/modules/batches";
import type { BatchLookup } from "../../../src/lib/batch-lookup";

export class InMemoryBatchLookup implements BatchLookup {
  private readonly byId = new Map<string, { id: string; name: string; status: BatchStatus }>();

  seed(id: string, status: BatchStatus, name = `Batch ${id}`): void {
    this.byId.set(id, { id, name, status });
  }

  async findById(id: string): Promise<{ id: string; name: string; status: BatchStatus } | null> {
    return this.byId.get(id) ?? null;
  }
}
