import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCoordinatorAccounts } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { BatchLookup } from "@/lib/batch-lookup";
import type { CoordinatorRecord } from "../../domain/entities";
import { BatchAlreadyAssignedError, BatchNotFoundError, CoordinatorNotFoundError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface AssignBatchInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
  batchId: string;
}

export class AssignBatchUseCase {
  constructor(
    private readonly deps: {
      coordinatorRepository: CoordinatorRepository;
      batchLookup: BatchLookup;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: AssignBatchInput): Promise<CoordinatorRecord> {
    if (!canManageCoordinatorAccounts(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage coordinator batch assignments");
    }

    const existing = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!existing) throw new CoordinatorNotFoundError();

    const batch = await this.deps.batchLookup.findById(input.batchId);
    if (!batch) throw new BatchNotFoundError();

    if (existing.batchIds.includes(input.batchId)) {
      throw new BatchAlreadyAssignedError();
    }

    const updated = await this.deps.coordinatorRepository.assignBatch(input.coordinatorId, input.batchId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COORDINATOR_BATCH_ASSIGNED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
      metadata: { batchId: input.batchId },
    });

    return updated;
  }
}
