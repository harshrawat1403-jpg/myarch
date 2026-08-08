import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import { RecruiterAccountNotFoundError, RecruiterNotPendingError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface RejectRecruiterInput {
  actor: AuthenticatedActor;
  recruiterId: string;
}

export class RejectRecruiterUseCase {
  constructor(
    private readonly deps: { recruiterAccountRepository: RecruiterAccountRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: RejectRecruiterInput): Promise<RecruiterAccountRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to reject recruiter accounts");
    }

    const existing = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!existing) throw new RecruiterAccountNotFoundError();
    if (existing.approvalStatus !== "PENDING") throw new RecruiterNotPendingError();

    const updated = await this.deps.recruiterAccountRepository.setApprovalStatus(input.recruiterId, "REJECTED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.RECRUITER_REJECTED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    return updated;
  }
}
