import type { AuthenticatedActor } from "@/modules/auth";
import { runBulkOperation, type BulkOperationResult } from "@/lib/bulk-operation";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { SetCoordinatorActiveUseCase } from "./set-coordinator-active";

export interface BulkSetCoordinatorsActiveInput {
  actor: AuthenticatedActor;
  coordinatorIds: readonly string[];
  isActive: boolean;
}

/**
 * Loops SetCoordinatorActiveUseCase per id via the shared runBulkOperation
 * helper — reuses the single-row use case's permission check, session
 * revocation, and audit record rather than duplicating that logic here.
 */
export class BulkSetCoordinatorsActiveUseCase {
  constructor(
    private readonly deps: { setCoordinatorActiveUseCase: SetCoordinatorActiveUseCase; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: BulkSetCoordinatorsActiveInput): Promise<BulkOperationResult> {
    const result = await runBulkOperation(input.coordinatorIds, (coordinatorId) =>
      this.deps.setCoordinatorActiveUseCase
        .execute({ actor: input.actor, coordinatorId, isActive: input.isActive })
        .then(() => undefined),
    );

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.BULK_OPERATION,
      targetEntityType: "CoordinatorProfile",
      targetEntityId: input.actor.userId,
      metadata: {
        entityType: "coordinator",
        operation: input.isActive ? "enable" : "disable",
        count: result.succeeded.length,
        failed: result.failed.length,
      },
    });

    return result;
  }
}
