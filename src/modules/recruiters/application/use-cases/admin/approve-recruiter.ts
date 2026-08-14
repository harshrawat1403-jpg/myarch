import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import { RecruiterAccountNotFoundError, RecruiterNotPendingError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface ApproveRecruiterInput {
  actor: AuthenticatedActor;
  recruiterId: string;
}

/**
 * Operates only on a PENDING account — today, exclusively a self-signed-up
 * one (MYARCH Phase 1, §2.4); Secretary-created accounts default to
 * APPROVED (creating one directly is the approval), so they never reach
 * this path. approveAndActivate flips both RecruiterProfile.approvalStatus
 * AND User.isActive together — the account was created inactive
 * specifically so approval is what grants login, not merely a status label
 * (see SignupRecruiterUseCase / provisionSelfSignupRecruiterUser).
 */
export class ApproveRecruiterUseCase {
  constructor(
    private readonly deps: {
      recruiterAccountRepository: RecruiterAccountRepository;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: ApproveRecruiterInput): Promise<RecruiterAccountRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to approve recruiter accounts");
    }

    const existing = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!existing) throw new RecruiterAccountNotFoundError();
    if (existing.approvalStatus !== "PENDING") throw new RecruiterNotPendingError();

    const updated = await this.deps.recruiterAccountRepository.approveAndActivate(input.recruiterId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.RECRUITER_APPROVED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    await this.deps.notificationService.notify({
      recipientUserId: existing.userId,
      template: "ACCOUNT_SIGNUP_DECIDED",
      context: { accountType: "RECRUITER", decision: "APPROVED" },
    });

    return updated;
  }
}
