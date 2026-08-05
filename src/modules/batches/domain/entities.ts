/**
 * Framework-free Domain layer types for the batches module
 * (docs/architecture/05_System_Architecture.md — no Prisma imports here).
 */

export type BatchStatus = "ACTIVE" | "GRADUATED" | "ARCHIVED";

export interface Batch {
  readonly id: string;
  readonly name: string;
  readonly year: number;
  readonly status: BatchStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
