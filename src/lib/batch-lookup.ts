import type { PrismaClient } from "@prisma/client";
import type { BatchStatus } from "@/modules/batches";

/**
 * A minimal, read-only port for validating a batch assignment/scope —
 * deliberately not a dependency on the batches module's Application layer
 * or repository. Batch is a shared Prisma model in this single-database
 * modular monolith (docs/architecture/05_System_Architecture.md); any
 * module is allowed to read it directly for this one narrow purpose
 * (existence + status), which keeps every module's Application layer
 * decoupled from the others while still sharing the one underlying table.
 * Promoted here from students/application/ports/batch-lookup.ts once
 * coordinators/ needed the identical thing — the same "second use is the
 * signal" rule already applied to AuditRecorder.
 */
export interface BatchLookup {
  findById(id: string): Promise<{ id: string; status: BatchStatus } | null>;
}

export class PrismaBatchLookup implements BatchLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<{ id: string; status: BatchStatus } | null> {
    return this.prisma.batch.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  }
}
