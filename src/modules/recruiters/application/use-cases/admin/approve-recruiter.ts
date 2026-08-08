import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import { RecruiterAccountNotFoundError, RecruiterNotPendingError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface ApproveRecruiterInput {
  actor: AuthenticatedActor;
  recruiterId: string;
}

/**
 * Operates only on a PENDING account. No public recruiter signup exists or
 * is being built in this phase (Secretary-created accounts default to
 * APPROVED — creating one directly is the approval), so this is real,
 * tested, and dormant until a future phase's public signup flow ever
 * inserts a PENDING row — not fabricated ahead of that need.
 */
export class ApproveRecruiterUseCase {
  constructor(
    private readonly deps: { recruiterAccountRepository: RecruiterAccountRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: ApproveRecruiterInput): Promise<RecruiterAccountRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to approve recruiter accounts");
    }

    const existing = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!existing) throw new RecruiterAccountNotFoundError();
    if (existing.approvalStatus !== "PENDING") throw new RecruiterNotPendingError();

    const updated = await this.deps.recruiterAccountRepository.setApprovalStatus(input.recruiterId, "APPROVED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.RECRUITER_APPROVED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    return updated;
  }
}
