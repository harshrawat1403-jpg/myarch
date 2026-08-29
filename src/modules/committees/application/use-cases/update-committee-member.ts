import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CommitteeMembershipRecord } from "../../domain/entities";
import { canManageCommittee } from "../../domain/permissions";
import { CommitteeMembershipNotFoundError, CommitteeNotFoundError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";

export interface UpdateCommitteeMemberInput {
  actor: AuthenticatedActor;
  committeeId: string;
  membershipId: string;
  position?: string | null;
  isLead?: boolean;
}

/** Edits a membership's position/lead flag only — never its committeeId/userId (a membership row is never reassigned to a different committee or user; end + re-add is the correct path for that). */
export class UpdateCommitteeMemberUseCase {
  constructor(
    private readonly deps: {
      committeeRepository: CommitteeRepository;
      committeeMembershipRepository: CommitteeMembershipRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: UpdateCommitteeMemberInput): Promise<CommitteeMembershipRecord> {
    const committee = await this.deps.committeeRepository.findById(input.committeeId);
    if (!committee) throw new CommitteeNotFoundError();

    const memberships = await this.deps.committeeMembershipRepository.listForCommittee(input.committeeId);
    if (!canManageCommittee(input.actor, memberships)) {
      throw new NotAuthorizedError("Not authorized to manage this committee's members");
    }

    const target = memberships.find((m) => m.id === input.membershipId);
    if (!target) throw new CommitteeMembershipNotFoundError();

    const membership = await this.deps.committeeMembershipRepository.update(input.membershipId, {
      position: input.position === undefined ? undefined : (input.position?.trim() ?? null),
      isLead: input.isLead,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_MEMBER_UPDATED,
      targetEntityType: "Committee",
      targetEntityId: input.committeeId,
      metadata: { membershipId: membership.id },
    });

    return membership;
  }
}
