import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { CoordinatorRecord } from "../../domain/entities";
import { CoordinatorNotFoundError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface GetCoordinatorInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
}

export class GetCoordinatorUseCase {
  constructor(private readonly deps: { coordinatorRepository: CoordinatorRepository }) {}

  async execute(input: GetCoordinatorInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view coordinator accounts");
    }
    const coordinator = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!coordinator) throw new CoordinatorNotFoundError();
    return coordinator;
  }
}
