import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import { DuplicateEmailError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";
import type { RecruiterUserProvisioner } from "../../ports/recruiter-user-provisioner";

export interface CreateRecruiterAccountInput {
  actor: AuthenticatedActor;
  email: string;
  fullName: string;
  companyName: string;
}

export interface CreateRecruiterAccountResult {
  recruiter: RecruiterAccountRecord;
  /** Plaintext — reveal-once. */
  tempPassword: string;
}

/**
 * Secretary-only — RecruiterProfile has no batch relation to scope a
 * Coordinator's authority against (see prisma/schema.prisma's Company/
 * PlacementDrive deferred-to-Phase-2 note), so unlike Student/Coordinator
 * management this is never Coordinator-reachable. A Secretary-created
 * account is pre-approved (approvalStatus defaults to APPROVED at the
 * schema level) — creating one directly *is* the approval.
 */
export class CreateRecruiterAccountUseCase {
  constructor(
    private readonly deps: {
      recruiterAccountRepository: RecruiterAccountRepository;
      recruiterUserProvisioner: RecruiterUserProvisioner;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: CreateRecruiterAccountInput): Promise<CreateRecruiterAccountResult> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to create recruiter accounts");
    }

    let userId: string;
    let tempPassword: string;
    try {
      const provisioned = await this.deps.recruiterUserProvisioner.provisionRecruiterUser(input.email);
      userId = provisioned.userId;
      tempPassword = provisioned.tempPassword;
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }

    const recruiter = await this.deps.recruiterAccountRepository.create({
      userId,
      fullName: input.fullName,
      companyName: input.companyName,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.RECRUITER_CREATED,
      targetEntityType: "User",
      targetEntityId: userId,
      metadata: { recruiterId: recruiter.id },
    });

    return { recruiter, tempPassword };
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}
