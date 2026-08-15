import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { CoordinatorRecord } from "../../domain/entities";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface GetMaintenanceCoordinatorInput {
  actor: AuthenticatedActor;
}

/**
 * MYARCH Maintenance functional hierarchy — "who currently holds
 * MAINTENANCE_COORDINATOR, and what maintenance.* permissions do they
 * have" for the Maintenance workspace's own "Maintenance Coordinator" tab.
 * Deliberately not the general SearchCoordinatorsUseCase (Secretary-only,
 * full stop) — a Maintenance Secretary needs to reach this too, and the
 * designated Maintenance Coordinator may view their own record.
 */
export class GetMaintenanceCoordinatorUseCase {
  constructor(private readonly deps: { coordinatorRepository: CoordinatorRepository }) {}

  async execute(input: GetMaintenanceCoordinatorInput): Promise<CoordinatorRecord | null> {
    const isSecretary = input.actor.role === "SECRETARY";
    const isMaintenanceSecretary = input.actor.role === "COORDINATOR" && input.actor.maintenanceRole === "MAINTENANCE_SECRETARY";
    const isMaintenanceCoordinator = input.actor.role === "COORDINATOR" && input.actor.maintenanceRole === "MAINTENANCE_COORDINATOR";
    if (!isSecretary && !isMaintenanceSecretary && !isMaintenanceCoordinator) {
      throw new NotAuthorizedError("Not authorized to view the Maintenance Coordinator");
    }

    return this.deps.coordinatorRepository.findActiveByMaintenanceRole("MAINTENANCE_COORDINATOR");
  }
}
