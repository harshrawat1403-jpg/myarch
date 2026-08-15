import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CoordinatorRecord } from "../../domain/entities";
import { InvalidCoordinatorPermissionError, NoMaintenanceCoordinatorDesignatedError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

/**
 * The fixed allowlist this narrow endpoint may ever touch — deliberately a
 * local subset of COORDINATOR_PERMISSION_KEYS (domain/permissions.ts), not
 * the full catalog. Kept as its own literal list (rather than derived by
 * filtering the full catalog by a "maintenance." prefix) so a future,
 * unrelated key that happens to start with "maintenance." can never be
 * silently swept into what a Maintenance Secretary is allowed to grant
 * without this list being deliberately updated too.
 */
const MAINTENANCE_COORDINATOR_PERMISSION_KEYS = [
  "maintenance.view",
  "maintenance.assign",
  "maintenance.manage",
  "maintenance.update",
  "maintenance.resolve",
  "maintenance.reassign",
  "maintenance.tasks",
  "maintenance.reports",
] as const;

export interface UpdateMaintenanceCoordinatorPermissionsInput {
  actor: AuthenticatedActor;
  /** The complete replacement set for the maintenance.* subset only — every other permission the target Coordinator might separately hold is preserved untouched. */
  permissions: readonly string[];
}

export interface UpdateMaintenanceCoordinatorPermissionsUseCaseDeps {
  coordinatorRepository: CoordinatorRepository;
  auditRecorder: AuditRecorder;
}

/**
 * MYARCH Maintenance functional hierarchy — the narrow capability a
 * Maintenance Secretary has that no ordinary Coordinator does: editing
 * (only) the maintenance.* subset of (only) the one Coordinator currently
 * designated MAINTENANCE_COORDINATOR. Deliberately a separate use case and
 * route from UpdateCoordinatorPermissionsUseCase (which stays
 * Secretary-only, full-array-replacement, untouched) rather than an
 * exception bolted onto it — see the architecture review's own reasoning
 * for why the peer-Coordinator-never-manages-another-Coordinator invariant
 * is preserved everywhere else in the system.
 *
 * The target is never a client-supplied id — resolved server-side via
 * `findActiveByMaintenanceRole`, so there is no "wrong target" class of bug
 * to defend against. Technical Secretary may also call this (full override,
 * per the architecture decision that Secretary retains unrestricted access
 * to every Maintenance function).
 */
export class UpdateMaintenanceCoordinatorPermissionsUseCase {
  constructor(private readonly deps: UpdateMaintenanceCoordinatorPermissionsUseCaseDeps) {}

  async execute(input: UpdateMaintenanceCoordinatorPermissionsInput): Promise<CoordinatorRecord> {
    const isSecretary = input.actor.role === "SECRETARY";
    const isMaintenanceSecretary = input.actor.role === "COORDINATOR" && input.actor.maintenanceRole === "MAINTENANCE_SECRETARY";
    if (!isSecretary && !isMaintenanceSecretary) {
      throw new NotAuthorizedError("Not authorized to manage the Maintenance Coordinator's permissions");
    }

    const uniquePermissions = [...new Set(input.permissions)];
    for (const key of uniquePermissions) {
      if (!(MAINTENANCE_COORDINATOR_PERMISSION_KEYS as readonly string[]).includes(key)) {
        throw new InvalidCoordinatorPermissionError(key);
      }
    }

    const target = await this.deps.coordinatorRepository.findActiveByMaintenanceRole("MAINTENANCE_COORDINATOR");
    if (!target) throw new NoMaintenanceCoordinatorDesignatedError();

    const preservedNonMaintenance = target.permissions.filter(
      (key) => !(MAINTENANCE_COORDINATOR_PERMISSION_KEYS as readonly string[]).includes(key),
    );
    const updated = await this.deps.coordinatorRepository.setPermissions(target.id, [
      ...preservedNonMaintenance,
      ...uniquePermissions,
    ]);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MAINTENANCE_COORDINATOR_PERMISSIONS_UPDATED,
      targetEntityType: "User",
      targetEntityId: target.userId,
      metadata: { permissions: uniquePermissions },
    });

    return updated;
  }
}
