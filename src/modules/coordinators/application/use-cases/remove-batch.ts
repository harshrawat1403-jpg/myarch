import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CoordinatorRecord } from "../../domain/entities";
import { BatchNotAssignedError, CoordinatorNotFoundError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface RemoveBatchInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  batchId: string;
}

export class RemoveBatchUseCase {
  constructor(
    private readonly deps: { coordinatorRepository: CoordinatorRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: RemoveBatchInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage coordinator batch assignments");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    if (!existing.batchIds.includes(input.batchId)) {
      throw new BatchNotAssignedError();
    }

    const updated = await this.deps.coordinatorRepository.removeBatch(input.coordinatorId, input.batchId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COORDINATOR_BATCH_REMOVED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
      metadata: { batchId: input.batchId },
    });

    return updated;
  }
}
