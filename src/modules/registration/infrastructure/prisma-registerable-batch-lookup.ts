import type { PrismaClient } from "@prisma/client";
import type { RegisterableBatchLookup, RegisterableBatchOption } from "../application/ports/registerable-batch-lookup";

export class PrismaRegisterableBatchLookup implements RegisterableBatchLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async listOpenBatches(): Promise<RegisterableBatchOption[]> {
    return this.prisma.batch.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
}
