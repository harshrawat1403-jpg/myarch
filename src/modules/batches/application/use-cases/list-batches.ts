import type { AuthenticatedActor } from "@/modules/auth";
import type { Batch } from "../../domain/entities";
import type { BatchRepository } from "../ports/batch-repository";

export interface ListBatchesInput {
  actor: AuthenticatedActor;
}

export class ListBatchesUseCase {
  constructor(private readonly deps: { batchRepository: BatchRepository }) {}

  async execute(input: ListBatchesInput): Promise<Batch[]> {
    // Secretary sees every batch; a Coordinator sees only their assigned
    // scope. This applies the actor's already-authorized scope (resolved
    // once, at login — docs/security/09_User_Roles_and_Permissions.md) as a
    // data filter; it is not a new permission decision.
    if (input.actor.role === "COORDINATOR") {
      const scope = input.actor.batchScope ?? [];
      if (scope.length === 0) return [];
      return this.deps.batchRepository.list({ ids: scope });
    }

    return this.deps.batchRepository.list();
  }
}
