import type { BatchStatus } from "@/modules/batches";

export interface BatchReference {
  readonly id: string;
  readonly name: string;
  readonly status: BatchStatus;
}

export interface CoordinatorReference {
  readonly id: string;
  readonly fullName: string;
}

/**
 * A minimal, read-only port for validating the wizard's plan inputs before
 * freezing them — deliberately not a dependency on the batches/coordinators
 * modules' Application layers. Batch and CoordinatorProfile are shared
 * Prisma models in this single-database modular monolith; reading them
 * directly for this one narrow validation purpose mirrors the existing
 * BatchLookup precedent (src/lib/batch-lookup.ts).
 */
export interface AcademicYearReferenceRepository {
  findBatchById(id: string): Promise<BatchReference | null>;
  findCoordinatorById(id: string): Promise<CoordinatorReference | null>;
}
