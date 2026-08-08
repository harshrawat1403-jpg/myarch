import type { AuthenticatedActor } from "../../domain/entities";
import { CurrentPasswordIncorrectError, EmailAlreadyInUseError } from "../../domain/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { PasswordHasher } from "../ports/password-hasher";
import type { ProfileNameRepository } from "../ports/profile-name-repository";
import type { UserRepository } from "../ports/user-repository";

export interface UpdateOwnProfileInput {
  readonly actor: AuthenticatedActor;
  readonly fullName?: string;
  readonly email?: string;
  /** Required only when `email` is being changed — the spec's "current password required for sensitive changes." */
  readonly currentPassword?: string;
}

export interface UpdateOwnProfileResult {
  readonly email: string;
}

export interface UpdateOwnProfileUseCaseDeps {
  userRepository: UserRepository;
  profileNameRepository: ProfileNameRepository;
  passwordHasher: PasswordHasher;
  auditRecorder: AuditRecorder;
}

/**
 * Secretary/Coordinator self-service: display name and/or email. Display
 * name alone needs no re-authentication (low stakes, easily corrected);
 * changing the email — the address used to sign in — requires the current
 * password, exactly like ChangeOwnPasswordUseCase requires it for a
 * password change.
 */
export class UpdateOwnProfileUseCase {
  constructor(private readonly deps: UpdateOwnProfileUseCaseDeps) {}

  async execute(input: UpdateOwnProfileInput): Promise<UpdateOwnProfileResult> {
    const user = await this.deps.userRepository.findById(input.actor.userId);
    if (!user) {
      throw new CurrentPasswordIncorrectError();
    }

    let email = user.email;

    if (input.email && input.email !== user.email) {
      const matches = await this.deps.passwordHasher.compare(input.currentPassword ?? "", user.passwordHash);
      if (!matches) {
        throw new CurrentPasswordIncorrectError();
      }

      const existing = await this.deps.userRepository.findByEmail(input.email);
      if (existing && existing.id !== user.id) {
        throw new EmailAlreadyInUseError();
      }

      await this.deps.userRepository.updateEmail(user.id, input.email);
      email = input.email;
    }

    if (input.fullName) {
      await this.deps.profileNameRepository.updateFullName(user.id, user.role, input.fullName);
    }

    await this.deps.auditRecorder.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.ACCOUNT_SETTINGS_UPDATED,
      targetEntityType: "User",
      targetEntityId: user.id,
    });

    return { email };
  }
}
