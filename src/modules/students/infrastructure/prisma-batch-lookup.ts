import type { PrismaClient } from "@prisma/client";
import type { BatchStatus } from "@/modules/batches";
import type { BatchLookup } from "../application/ports/batch-lookup";

export class PrismaBatchLookup implements BatchLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<{ id: string; status: BatchStatus } | null> {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    return batch;
  }
}
