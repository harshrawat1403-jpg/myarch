import type { AuthenticatedActor } from "@/modules/auth";
import { canManageBatches } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { Batch } from "../../domain/entities";
import type { BatchRepository } from "../ports/batch-repository";

export interface CreateBatchInput {
  actor: AuthenticatedActor;
  name: string;
  year: number;
}

export class CreateBatchUseCase {
  constructor(private readonly deps: { batchRepository: BatchRepository }) {}

  async execute(input: CreateBatchInput): Promise<Batch> {
    // Defense in depth: the route is already role-gated to SECRETARY via
    // withAuth, but the same centralized check is re-applied here so this
    // use case is safe to call from anywhere, not just that one route
    // (docs/security/14_Security_Architecture.md — authorization enforced
    // server-side, not assumed from the caller's context).
    if (!canManageBatches(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage batches");
    }

    return this.deps.batchRepository.create({ name: input.name, year: input.year });
  }
}
