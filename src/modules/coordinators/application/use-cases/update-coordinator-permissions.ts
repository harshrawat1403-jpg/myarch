import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CoordinatorRecord } from "../../domain/entities";
import { CoordinatorNotFoundError, InvalidCoordinatorPermissionError } from "../../domain/errors";
import { isCoordinatorPermissionKey } from "../../domain/permissions";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface UpdateCoordinatorPermissionsInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  /** The complete replacement set — not a diff/add/remove — matching setPermissions' own contract. */
  permissions: readonly string[];
}

export interface UpdateCoordinatorPermissionsUseCaseDeps {
  coordinatorRepository: CoordinatorRepository;
  auditRecorder: AuditRecorder;
}

/**
 * Technical-Secretary-only (roadmap §2.2 — "delegate permissions / revoke
 * permissions"). Same authorization gate as every other Coordinator-account
 * management action (canManageCoordinatorAccounts) — granting/revoking
 * granular capabilities is itself a Coordinator-account-management action,
 * not a separate permission surface.
 */
export class UpdateCoordinatorPermissionsUseCase {
  constructor(private readonly deps: UpdateCoordinatorPermissionsUseCaseDeps) {}

  async execute(input: UpdateCoordinatorPermissionsInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage coordinator permissions");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    const uniquePermissions = [...new Set(input.permissions)];
    for (const key of uniquePermissions) {
      if (!isCoordinatorPermissionKey(key)) {
        throw new InvalidCoordinatorPermissionError(key);
      }
    }

    const updated = await this.deps.coordinatorRepository.setPermissions(
      input.coordinatorId,
      uniquePermissions,
    );

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COORDINATOR_UPDATED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
      metadata: { permissions: uniquePermissions },
    });

    return updated;
  }
}
