import type { AuthenticatedActor } from "@/modules/auth";
import { runBulkOperation, type BulkOperationResult } from "@/lib/bulk-operation";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { SetRecruiterActiveUseCase } from "./set-recruiter-active";

export interface BulkSetRecruitersActiveInput {
  actor: AuthenticatedActor;
  recruiterIds: readonly string[];
  isActive: boolean;
}

export class BulkSetRecruitersActiveUseCase {
  constructor(
    private readonly deps: { setRecruiterActiveUseCase: SetRecruiterActiveUseCase; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: BulkSetRecruitersActiveInput): Promise<BulkOperationResult> {
    const result = await runBulkOperation(input.recruiterIds, (recruiterId) =>
      this.deps.setRecruiterActiveUseCase
        .execute({ actor: input.actor, recruiterId, isActive: input.isActive })
        .then(() => undefined),
    );

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.BULK_OPERATION,
      targetEntityType: "RecruiterProfile",
      targetEntityId: input.actor.userId,
      metadata: {
        entityType: "recruiter",
        operation: input.isActive ? "enable" : "disable",
        count: result.succeeded.length,
        failed: result.failed.length,
      },
    });

    return result;
  }
}
