import type { AuthenticatedActor } from "@/modules/auth";
import { canChangeBatchLifecycleStatus } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { Batch, BatchStatus } from "../../domain/entities";
import { BatchNotFoundError } from "../../domain/errors";
import type { BatchRepository } from "../ports/batch-repository";

export interface UpdateBatchStatusInput {
  actor: AuthenticatedActor;
  batchId: string;
  status: BatchStatus;
}

/**
 * Covers both "archive a batch" (FR-BATCH-03) and "mark a batch graduated"
 * (FR-BATCH-04) — both are the same operation (a Secretary-only lifecycle
 * transition) with a different target status, so one use case serves both
 * rather than two near-identical ones.
 */
export class UpdateBatchStatusUseCase {
  constructor(private readonly deps: { batchRepository: BatchRepository }) {}

  async execute(input: UpdateBatchStatusInput): Promise<Batch> {
    if (!canChangeBatchLifecycleStatus(input.actor)) {
      throw new NotAuthorizedError("Not authorized to change batch lifecycle status");
    }

    const existing = await this.deps.batchRepository.findById(input.batchId);
    if (!existing) {
      throw new BatchNotFoundError();
    }

    return this.deps.batchRepository.updateStatus(input.batchId, input.status);
  }
}
