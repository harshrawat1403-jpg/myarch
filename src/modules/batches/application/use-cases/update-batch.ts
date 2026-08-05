import type { AuthenticatedActor } from "@/modules/auth";
import { canManageBatches } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { Batch } from "../../domain/entities";
import { BatchNotFoundError } from "../../domain/errors";
import type { BatchRepository } from "../ports/batch-repository";

export interface UpdateBatchInput {
  actor: AuthenticatedActor;
  batchId: string;
  name?: string;
  year?: number;
}

export class UpdateBatchUseCase {
  constructor(private readonly deps: { batchRepository: BatchRepository }) {}

  async execute(input: UpdateBatchInput): Promise<Batch> {
    if (!canManageBatches(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage batches");
    }

    const existing = await this.deps.batchRepository.findById(input.batchId);
    if (!existing) {
      throw new BatchNotFoundError();
    }

    return this.deps.batchRepository.update(input.batchId, {
      name: input.name,
      year: input.year,
    });
  }
}
