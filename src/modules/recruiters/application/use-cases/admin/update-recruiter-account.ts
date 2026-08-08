import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import { RecruiterAccountNotFoundError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface UpdateRecruiterAccountInput {
  actor: AuthenticatedActor;
  recruiterId: string;
  fullName?: string;
  companyName?: string;
}

export class UpdateRecruiterAccountUseCase {
  constructor(
    private readonly deps: { recruiterAccountRepository: RecruiterAccountRepository; auditRecorder: AuditRecorder },
  ) {}

  async execute(input: UpdateRecruiterAccountInput): Promise<RecruiterAccountRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to update recruiter accounts");
    }

    const existing = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!existing) throw new RecruiterAccountNotFoundError();

    const updated = await this.deps.recruiterAccountRepository.update(input.recruiterId, {
      fullName: input.fullName,
      companyName: input.companyName,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.RECRUITER_UPDATED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    return updated;
  }
}
