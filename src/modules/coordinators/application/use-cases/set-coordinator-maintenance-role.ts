import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { MAX_ACTIVE_MAINTENANCE_COORDINATORS, MAX_ACTIVE_MAINTENANCE_SECRETARIES, type CoordinatorRecord, type MaintenanceCoordinatorRole } from "../../domain/entities";
import { CoordinatorNotFoundError, InactiveCoordinatorError, MaxActiveMaintenanceRoleError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface SetCoordinatorMaintenanceRoleInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  /** null clears the designation — an ordinary Coordinator again. */
  maintenanceRole: MaintenanceCoordinatorRole | null;
}

export interface SetCoordinatorMaintenanceRoleUseCaseDeps {
  coordinatorRepository: CoordinatorRepository;
  auditRecorder: AuditRecorder;
}

const MAX_BY_ROLE: Record<MaintenanceCoordinatorRole, number> = {
  MAINTENANCE_SECRETARY: MAX_ACTIVE_MAINTENANCE_SECRETARIES,
  MAINTENANCE_COORDINATOR: MAX_ACTIVE_MAINTENANCE_COORDINATORS,
};

/**
 * MYARCH Maintenance functional hierarchy — designates or clears a
 * Coordinator's maintenanceRole. Technical-Secretary-only: the same
 * `canManageCoordinatorAccounts` gate as every other Coordinator-account
 * management action (create, disable/enable, delegate permissions) —
 * assigning a Coordinator into this hierarchy IS a Coordinator-account
 * management action, not a separate authorization surface. A Maintenance
 * Secretary cannot call this use case at all (cannot create another
 * Maintenance Secretary, cannot self-promote, cannot designate the
 * Maintenance Coordinator) — that narrower, Maintenance-scoped power is
 * UpdateMaintenanceCoordinatorPermissionsUseCase, a different use case
 * entirely.
 */
export class SetCoordinatorMaintenanceRoleUseCase {
  constructor(private readonly deps: SetCoordinatorMaintenanceRoleUseCaseDeps) {}

  async execute(input: SetCoordinatorMaintenanceRoleInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage coordinator functional roles");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    if (input.maintenanceRole !== null) {
      if (!existing.isActive) throw new InactiveCoordinatorError();

      const activeCount = await this.deps.coordinatorRepository.countActiveByMaintenanceRole(
        input.maintenanceRole,
        input.coordinatorId,
      );
      if (activeCount >= MAX_BY_ROLE[input.maintenanceRole]) {
        throw new MaxActiveMaintenanceRoleError(input.maintenanceRole);
      }
    }

    const updated = await this.deps.coordinatorRepository.setMaintenanceRole(input.coordinatorId, input.maintenanceRole);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COORDINATOR_MAINTENANCE_ROLE_SET,
      targetEntityType: "User",
      targetEntityId: existing.userId,
      metadata: { maintenanceRole: input.maintenanceRole },
    });

    return updated;
  }
}
