import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { Batch } from "../../domain/entities";
import { BatchNotFoundError } from "../../domain/errors";
import type { BatchRepository } from "../ports/batch-repository";

export interface GetBatchInput {
  actor: AuthenticatedActor;
  batchId: string;
}

export class GetBatchUseCase {
  constructor(private readonly deps: { batchRepository: BatchRepository }) {}

  async execute(input: GetBatchInput): Promise<Batch> {
    const batch = await this.deps.batchRepository.findById(input.batchId);
    if (!batch) {
      throw new BatchNotFoundError();
    }

    // Defense in depth alongside the route's withAuth batch-scope check —
    // see docs/security/14_Security_Architecture.md.
    if (input.actor.role === "COORDINATOR" && !(input.actor.batchScope ?? []).includes(batch.id)) {
      throw new NotAuthorizedError("This batch is outside your assigned scope");
    }

    return batch;
  }
}
