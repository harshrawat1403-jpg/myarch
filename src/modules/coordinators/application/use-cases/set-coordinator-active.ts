import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { MAX_ACTIVE_COORDINATORS, type CoordinatorRecord } from "../../domain/entities";
import {
  CoordinatorAlreadyActiveError,
  CoordinatorAlreadyDisabledError,
  CoordinatorNotFoundError,
  MaxActiveCoordinatorsError,
} from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface SetCoordinatorActiveInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  isActive: boolean;
}

export interface SetCoordinatorActiveUseCaseDeps {
  coordinatorRepository: CoordinatorRepository;
  auditRecorder: AuditRecorder;
  /** Injected (rather than importing @/modules/auth's bound revokeUserSessions directly) so this use case stays testable against a fake — see container.ts for the real wiring. */
  revokeUserSessions: (userId: string) => Promise<void>;
}

/**
 * One use case for both disable and enable (boolean param), mirroring
 * ArchiveStudentUseCase/RestoreStudentUseCase's shared setActive
 * repository method — "Disable" and "Delete (soft delete)" from the spec
 * are the same toggle here, matching the CoordinatorProfile.isActive
 * schema decision. Disabling additionally revokes every existing session
 * immediately (students/ has no equivalent — that module predates
 * revokeAllForUser and is out of this phase's scope to retrofit, but new
 * Coordinator/Recruiter disable code should use it from the start).
 */
export class SetCoordinatorActiveUseCase {
  constructor(private readonly deps: SetCoordinatorActiveUseCaseDeps) {}

  async execute(input: SetCoordinatorActiveInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage coordinator accounts");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    if (input.isActive && existing.isActive) throw new CoordinatorAlreadyActiveError();
    if (!input.isActive && !existing.isActive) throw new CoordinatorAlreadyDisabledError();

    if (input.isActive) {
      const activeCount = await this.deps.coordinatorRepository.countActive();
      if (activeCount >= MAX_ACTIVE_COORDINATORS) {
        throw new MaxActiveCoordinatorsError();
      }
    }

    const updated = await this.deps.coordinatorRepository.setActive(input.coordinatorId, input.isActive);

    if (!input.isActive) {
      await this.deps.revokeUserSessions(existing.userId);
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: input.isActive ? AUDIT_ACTIONS.COORDINATOR_ENABLED : AUDIT_ACTIONS.COORDINATOR_DISABLED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    return updated;
  }
}
