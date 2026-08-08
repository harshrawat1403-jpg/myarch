import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CoordinatorRecord } from "../../domain/entities";
import { CoordinatorNotFoundError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface UpdateCoordinatorInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  fullName?: string;
}

export class UpdateCoordinatorUseCase {
  constructor(private readonly deps: { coordinatorRepository: CoordinatorRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateCoordinatorInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to update coordinator accounts");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    const updated = await this.deps.coordinatorRepository.update(input.coordinatorId, {
      fullName: input.fullName,
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
