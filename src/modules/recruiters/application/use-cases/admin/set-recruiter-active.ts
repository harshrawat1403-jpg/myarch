import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import {
  RecruiterAccountNotFoundError,
  RecruiterAlreadyActiveError,
  RecruiterAlreadyDisabledError,
} from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface SetRecruiterActiveInput {
  actor: AuthenticatedActor;
  recruiterId: string;
  isActive: boolean;
}

export interface SetRecruiterActiveUseCaseDeps {
  recruiterAccountRepository: RecruiterAccountRepository;
  auditRecorder: AuditRecorder;
  revokeUserSessions: (userId: string) => Promise<void>;
}

/** Mirrors coordinators/application/use-cases/set-coordinator-active.ts exactly. */
export class SetRecruiterActiveUseCase {
  constructor(private readonly deps: SetRecruiterActiveUseCaseDeps) {}

  async execute(input: SetRecruiterActiveInput): Promise<RecruiterAccountRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to manage recruiter accounts");
    }

    const existing = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!existing) throw new RecruiterAccountNotFoundError();

    if (input.isActive && existing.isActive) throw new RecruiterAlreadyActiveError();
    if (!input.isActive && !existing.isActive) throw new RecruiterAlreadyDisabledError();

    const updated = await this.deps.recruiterAccountRepository.setActive(input.recruiterId, input.isActive);

    if (!input.isActive) {
      await this.deps.revokeUserSessions(existing.userId);
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: input.isActive ? AUDIT_ACTIONS.RECRUITER_ENABLED : AUDIT_ACTIONS.RECRUITER_DISABLED,
      targetEntityType: "User",
      targetEntityId: existing.userId,
    });

    return updated;
  }
}
