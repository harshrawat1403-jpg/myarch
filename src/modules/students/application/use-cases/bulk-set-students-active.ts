import type { AuthenticatedActor } from "@/modules/auth";
import { runBulkOperation, type BulkOperationResult } from "@/lib/bulk-operation";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { ArchiveStudentUseCase } from "./archive-student";
import type { RestoreStudentUseCase } from "./restore-student";

export interface BulkSetStudentsActiveInput {
  actor: AuthenticatedActor;
  studentIds: readonly string[];
  isActive: boolean;
}

/**
 * Loops ArchiveStudentUseCase/RestoreStudentUseCase per id via the shared
 * runBulkOperation helper — reuses each single-row use case's own
 * batch-scoped permission check rather than duplicating it here. Mirrors
 * BulkSetCoordinatorsActiveUseCase/BulkSetRecruitersActiveUseCase exactly.
 */
export class BulkSetStudentsActiveUseCase {
  constructor(
    private readonly deps: {
      archiveStudentUseCase: ArchiveStudentUseCase;
      restoreStudentUseCase: RestoreStudentUseCase;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: BulkSetStudentsActiveInput): Promise<BulkOperationResult> {
    const result = await runBulkOperation(input.studentIds, (studentId) =>
      (input.isActive
        ? this.deps.restoreStudentUseCase.execute({ actor: input.actor, studentId })
        : this.deps.archiveStudentUseCase.execute({ actor: input.actor, studentId })
      ).then(() => undefined),
    );

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.BULK_OPERATION,
      targetEntityType: "StudentProfile",
      targetEntityId: input.actor.userId,
      metadata: {
        entityType: "student",
        operation: input.isActive ? "restore" : "archive",
        count: result.succeeded.length,
        failed: result.failed.length,
      },
    });

    return result;
  }
}
