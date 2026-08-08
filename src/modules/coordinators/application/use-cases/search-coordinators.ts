import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { CoordinatorRecord, CoordinatorSearchFilters } from "../../domain/entities";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface SearchCoordinatorsInput {
  actor: AuthenticatedActor;
  filters: CoordinatorSearchFilters;
}

export class SearchCoordinatorsUseCase {
  constructor(private readonly deps: { coordinatorRepository: CoordinatorRepository }) {}

  async execute(input: SearchCoordinatorsInput): Promise<CoordinatorRecord[]> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view coordinator accounts");
    }
    return this.deps.coordinatorRepository.search(input.filters);
  }
}
