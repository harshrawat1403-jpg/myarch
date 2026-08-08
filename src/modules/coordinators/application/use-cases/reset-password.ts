import type { AdminResetPasswordInput, AdminResetPasswordResult, AuthenticatedActor } from "@/modules/auth";
import { CoordinatorNotFoundError } from "../../domain/errors";
import type { CoordinatorRepository } from "../ports/coordinator-repository";

export interface ResetCoordinatorPasswordInput {
  actor: AuthenticatedActor;
  coordinatorId: string;
}

export interface ResetCoordinatorPasswordResult {
  tempPassword: string;
}

export interface ResetCoordinatorPasswordUseCaseDeps {
  coordinatorRepository: CoordinatorRepository;
  /** Injected (rather than importing @/modules/auth's bound getAdminResetPasswordUseCase directly) so this use case stays testable against a fake — see container.ts for the real wiring, and SetCoordinatorActiveUseCase's revokeUserSessions injection for the identical precedent. */
  resetPassword: (input: AdminResetPasswordInput) => Promise<AdminResetPasswordResult>;
}

/**
 * Thin wrapper delegating to auth's single shared AdminResetPasswordUseCase
 * — this module's own job is only resolving coordinatorId -> the target
 * User id/role auth's use case actually needs.
 */
export class ResetCoordinatorPasswordUseCase {
  constructor(private readonly deps: ResetCoordinatorPasswordUseCaseDeps) {}

  async execute(input: ResetCoordinatorPasswordInput): Promise<ResetCoordinatorPasswordResult> {
    const coordinator = await this.deps.coordinatorRepository.findById(input.coordinatorId);
    if (!coordinator) throw new CoordinatorNotFoundError();

    const result = await this.deps.resetPassword({
      actor: input.actor,
      targetUserId: coordinator.userId,
      targetRole: "COORDINATOR",
      recipientName: coordinator.fullName,
    });

    return { tempPassword: result.tempPassword };
  }
}
