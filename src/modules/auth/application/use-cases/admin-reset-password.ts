import type { AuthenticatedActor, Role } from "../../domain/entities";
import { UserNotFoundError } from "../../domain/errors";
import { generateTempPassword } from "../../domain/temp-password";
import {
  canEditPrivateAdminFields,
  canManageCoordinatorAccounts,
} from "../../domain/permissions";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { NotificationService } from "@/modules/notifications";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { PasswordHasher } from "../ports/password-hasher";
import type { RefreshTokenRepository } from "../ports/refresh-token-repository";
import type { UserRepository } from "../ports/user-repository";

export interface AdminResetPasswordInput {
  readonly actor: AuthenticatedActor;
  readonly targetUserId: string;
  readonly targetRole: Role;
  /** Required (and checked) only for a STUDENT target — Coordinator/Recruiter management is Secretary-only, see the permission dispatch below. */
  readonly targetBatchId?: string;
  readonly recipientName: string;
}

export interface AdminResetPasswordResult {
  /** Plaintext — reveal-once. Never persisted, never logged, never included in a notification's context (see the notify() call below). */
  readonly tempPassword: string;
}

export interface AdminResetPasswordUseCaseDeps {
  userRepository: UserRepository;
  refreshTokenRepository: RefreshTokenRepository;
  passwordHasher: PasswordHasher;
  auditRecorder: AuditRecorder;
  notificationService: NotificationService;
}

/**
 * The single shared password-reset primitive every role-management UI
 * (Student, Coordinator, Recruiter) calls into — built once in `auth` rather
 * than three times, since resetting a password is identical machinery
 * regardless of which role holds the account: generate a temp password,
 * force a change on next login, kill every existing session immediately,
 * audit it, and hand the plaintext back exactly once for the caller's
 * reveal-once UI.
 */
export class AdminResetPasswordUseCase {
  constructor(private readonly deps: AdminResetPasswordUseCaseDeps) {}

  async execute(input: AdminResetPasswordInput): Promise<AdminResetPasswordResult> {
    this.assertPermitted(input);

    const target = await this.deps.userRepository.findById(input.targetUserId);
    if (!target || target.role !== input.targetRole) {
      throw new UserNotFoundError();
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await this.deps.passwordHasher.hash(tempPassword);

    await this.deps.userRepository.setPasswordAndForceChange(target.id, passwordHash);
    await this.deps.refreshTokenRepository.revokeAllForUser(target.id);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      targetEntityType: "User",
      targetEntityId: target.id,
      metadata: { targetRole: input.targetRole },
    });

    // No password field in context — see account-credentials-issued.ts's
    // doc comment on why a secret must never land in Notification.payload
    // or Job.payload.
    await this.deps.notificationService
      .notify({
        recipientUserId: target.id,
        template: "ACCOUNT_CREDENTIALS_ISSUED",
        context: { recipientName: input.recipientName, reason: "password_reset" },
      })
      .catch(() => {
        // Best-effort — a notification-dispatch failure must never block the
        // reset itself, which has already succeeded by this point.
      });

    return { tempPassword };
  }

  private assertPermitted(input: AdminResetPasswordInput): void {
    switch (input.targetRole) {
      case "STUDENT":
        if (!input.targetBatchId || !canEditPrivateAdminFields(input.actor, input.targetBatchId)) {
          throw new NotAuthorizedError();
        }
        return;
      case "COORDINATOR":
        if (!canManageCoordinatorAccounts(input.actor)) {
          throw new NotAuthorizedError();
        }
        return;
      case "RECRUITER":
        // RecruiterProfile has no batch relation to scope a Coordinator's
        // authority against (see prisma/schema.prisma's doc comment on why
        // Company/PlacementDrive — and the batch-scoped drive relationship
        // that would make Coordinator recruiter-management meaningful — are
        // deferred to Phase 2), so recruiter account management is
        // Secretary-only rather than passing a fabricated batch id.
        if (input.actor.role !== "SECRETARY") {
          throw new NotAuthorizedError();
        }
        return;
      case "SECRETARY":
        // No use case ever resets a Secretary's password through this path.
        throw new NotAuthorizedError();
    }
  }
}
