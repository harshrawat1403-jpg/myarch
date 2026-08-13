import crypto from "node:crypto";
import type { AuthenticatedActor } from "../../domain/entities";
import {
  DEMO_ACCOUNT_EMAILS,
  roleForDemoPersona,
  type DemoPersona,
} from "../../domain/demo-accounts";
import { DemoAccountNotSeededError } from "../../domain/errors";
import { issueSessionTokens } from "../issue-session";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { Clock } from "../ports/clock";
import type { RefreshTokenRepository } from "../ports/refresh-token-repository";
import type { TokenService } from "../ports/token-service";
import type { UserRepository } from "../ports/user-repository";

export interface DemoLoginInput {
  readonly persona: DemoPersona;
}

export interface DemoLoginResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly actor: AuthenticatedActor;
}

export interface DemoLoginUseCaseDeps {
  userRepository: UserRepository;
  refreshTokenRepository: RefreshTokenRepository;
  tokenService: TokenService;
  auditRecorder: AuditRecorder;
  clock: Clock;
  refreshTokenTtlMs: number;
}

/**
 * The public MYARCH showcase's entry point — "Visit as Student / Recruiter
 * / Demo Admin" on the marketing landing page. Issues a real session
 * (same token machinery as LoginUseCase) for one of exactly three fixed,
 * pre-seeded accounts (domain/demo-accounts.ts) — never for arbitrary
 * input, and never password-checked, because there is nothing to check:
 * this does not bypass a real account's authentication, it signs into a
 * purpose-built demo identity that ships with prisma/seed.ts.
 *
 * Every session issued here carries `isDemo: true`, which with-auth.ts
 * uses to reject every non-GET request platform-wide, regardless of role —
 * a visitor can explore the real, live dashboards but can never create,
 * change, or delete anything.
 */
export class DemoLoginUseCase {
  constructor(private readonly deps: DemoLoginUseCaseDeps) {}

  async execute(input: DemoLoginInput): Promise<DemoLoginResult> {
    const email = DEMO_ACCOUNT_EMAILS[input.persona];
    const user = await this.deps.userRepository.findByEmail(email);
    if (!user || !user.isActive || user.role !== roleForDemoPersona(input.persona)) {
      throw new DemoAccountNotSeededError();
    }

    const scope = await this.deps.userRepository.loadActorScope(user);
    const actor: AuthenticatedActor = {
      userId: user.id,
      role: user.role,
      ...scope,
      isDemo: true,
    };

    const familyId = crypto.randomUUID();
    const tokens = await issueSessionTokens(this.deps, actor, familyId);

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: "DEMO_LOGIN",
      targetEntityType: "User",
      targetEntityId: actor.userId,
      metadata: { persona: input.persona },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      actor,
    };
  }
}
