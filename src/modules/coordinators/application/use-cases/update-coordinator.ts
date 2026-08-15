import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { normalizeCoordinatorPosition, type CoordinatorPosition, type CoordinatorRecord } from "../../domain/entities";
import { CoordinatorNotFoundError, InvalidCustomPositionError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface UpdateCoordinatorInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  fullName?: string;
  /** Display/reporting label only — see CoordinatorPosition doc comment. `null` clears it. */
  position?: CoordinatorPosition | null;
  /** Required (and trimmed) when position is "OTHER"; ignored/cleared otherwise — see normalizeCoordinatorPosition. Only consulted when `position` is also provided. */
  customPosition?: string | null;
}

export class UpdateCoordinatorUseCase {
  constructor(private readonly deps: { coordinatorRepository: CoordinatorRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateCoordinatorInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to update coordinator accounts");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    // customPosition is only meaningful paired with a position change — an
    // update that omits `position` entirely leaves both fields untouched,
    // exactly preserving whatever the Coordinator's position already was
    // (including a legacy T_AND_P/ALUMNI value) rather than silently
    // rewriting it.
    let position = input.position;
    let customPosition: string | null | undefined;
    if (position !== undefined) {
      const normalized = normalizeCoordinatorPosition(position, input.customPosition, () => {
        throw new InvalidCustomPositionError();
      });
      position = normalized.position;
      customPosition = normalized.customPosition;
    }

    const updated = await this.deps.coordinatorRepository.update(input.coordinatorId, {
      fullName: input.fullName,
      position,
      customPosition,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COORDINATOR_UPDATED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    return updated;
  }
}
