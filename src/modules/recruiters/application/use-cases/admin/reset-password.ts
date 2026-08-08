import type { AdminResetPasswordInput, AdminResetPasswordResult, AuthenticatedActor } from "@/modules/auth";
import { RecruiterAccountNotFoundError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface ResetRecruiterPasswordInput {
  actor: AuthenticatedActor;
  recruiterId: string;
}

export interface ResetRecruiterPasswordResult {
  tempPassword: string;
}

export interface ResetRecruiterPasswordUseCaseDeps {
  recruiterAccountRepository: RecruiterAccountRepository;
  /** Injected — see ResetCoordinatorPasswordUseCase's identical dependency for the reasoning. */
  resetPassword: (input: AdminResetPasswordInput) => Promise<AdminResetPasswordResult>;
}

/** Thin wrapper delegating to auth's single shared AdminResetPasswordUseCase — mirrors coordinators' reset-password.ts. */
export class ResetRecruiterPasswordUseCase {
  constructor(private readonly deps: ResetRecruiterPasswordUseCaseDeps) {}

  async execute(input: ResetRecruiterPasswordInput): Promise<ResetRecruiterPasswordResult> {
    const recruiter = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!recruiter) throw new RecruiterAccountNotFoundError();

    const result = await this.deps.resetPassword({
      actor: input.actor,
      targetUserId: recruiter.userId,
      targetRole: "RECRUITER",
      recipientName: recruiter.fullName,
    });

    return { tempPassword: result.tempPassword };
  }
}
