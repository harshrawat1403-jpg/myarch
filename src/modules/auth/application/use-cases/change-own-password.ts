import crypto from "node:crypto";
import type { AuthenticatedActor } from "../../domain/entities";
import { CurrentPasswordIncorrectError, NewPasswordSameAsCurrentError } from "../../domain/errors";
import { issueSessionTokens, type IssueSessionTokensDeps } from "../issue-session";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { PasswordHasher } from "../ports/password-hasher";
import type { UserRepository } from "../ports/user-repository";

export interface ChangeOwnPasswordInput {
  readonly actor: AuthenticatedActor;
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface ChangeOwnPasswordResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly actor: AuthenticatedActor;
}

export interface ChangeOwnPasswordUseCaseDeps extends IssueSessionTokensDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  auditRecorder: AuditRecorder;
}

/**
 * Self-service password change — the only path that ever clears
 * mustChangePassword, since clearing it requires proving knowledge of the
 * current (possibly temporary) password. Revokes every existing session
 * (every device this account was logged into) and issues exactly one fresh
 * session for the device that just completed this request, so a stale
 * mustChangePassword:true access token on another device can't linger.
 */
export class ChangeOwnPasswordUseCase {
  constructor(private readonly deps: ChangeOwnPasswordUseCaseDeps) {}

  async execute(input: ChangeOwnPasswordInput): Promise<ChangeOwnPasswordResult> {
    const user = await this.deps.userRepository.findById(input.actor.userId);
    if (!user) {
      // The presented access token was valid, so a missing user record here
      // would mean the account was deleted mid-session — treat identically
      // to a wrong current password rather than leaking that detail.
      throw new CurrentPasswordIncorrectError();
    }

    const matches = await this.deps.passwordHasher.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new CurrentPasswordIncorrectError();
    }

    if (input.currentPassword === input.newPassword) {
      throw new NewPasswordSameAsCurrentError();
    }

    const newHash = await this.deps.passwordHasher.hash(input.newPassword);
    await this.deps.userRepository.setPassword(user.id, newHash);
    await this.deps.refreshTokenRepository.revokeAllForUser(user.id);

    // Omit mustChangePassword entirely (rather than setting it false) to
    // match every other actor-construction site's convention — the field is
    // only ever present when true.
    const { mustChangePassword: _mustChangePassword, ...actorWithoutFlag } = input.actor;
    const actor: AuthenticatedActor = actorWithoutFlag;
    const familyId = crypto.randomUUID();
    const tokens = await issueSessionTokens(this.deps, actor, familyId);

    await this.deps.auditRecorder.record({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      targetEntityType: "User",
      targetEntityId: user.id,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      actor,
    };
  }
}
