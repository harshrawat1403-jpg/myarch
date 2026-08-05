import type { BatchStatus } from "@/modules/batches";

/**
 * A minimal, read-only port for validating a batch assignment — deliberately
 * NOT a dependency on the batches module's application layer or repository.
 * Batch is a shared Prisma model in this single-database modular monolith
 * (docs/architecture/05_System_Architecture.md); the students module is
 * allowed to read it directly for this one narrow purpose (existence +
 * status), which keeps the two modules' Application layers decoupled from
 * each other while still sharing the one underlying table.
 */
export interface BatchLookup {
  findById(id: string): Promise<{ id: string; status: BatchStatus } | null>;
}
