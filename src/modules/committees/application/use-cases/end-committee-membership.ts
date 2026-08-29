import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CommitteeMembershipRecord } from "../../domain/entities";
import { canManageCommittee } from "../../domain/permissions";
import { CommitteeMembershipNotFoundError, CommitteeNotFoundError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";

export interface EndCommitteeMembershipInput {
  actor: AuthenticatedActor;
  committeeId: string;
  membershipId: string;
}

/** Soft only — sets isActive: false / endDate: now() via the repository's own `end()`. Never deletes the row (§5: "preserve historical membership"). */
export class EndCommitteeMembershipUseCase {
  constructor(
    private readonly deps: {
      committeeRepository: CommitteeRepository;
      committeeMembershipRepository: CommitteeMembershipRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: EndCommitteeMembershipInput): Promise<CommitteeMembershipRecord> {
    const committee = await this.deps.committeeRepository.findById(input.committeeId);
    if (!committee) throw new CommitteeNotFoundError();

    const memberships = await this.deps.committeeMembershipRepository.listForCommittee(input.committeeId);
    if (!canManageCommittee(input.actor, memberships)) {
      throw new NotAuthorizedError("Not authorized to manage this committee's members");
    }

    const target = memberships.find((m) => m.id === input.membershipId);
    if (!target) throw new CommitteeMembershipNotFoundError();

    const membership = await this.deps.committeeMembershipRepository.end(input.membershipId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_MEMBERSHIP_ENDED,
      targetEntityType: "Committee",
      targetEntityId: input.committeeId,
      metadata: { membershipId: membership.id, userId: membership.userId },
    });

    return membership;
  }
}
