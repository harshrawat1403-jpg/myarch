import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CommitteeRecord } from "../../domain/entities";
import { canManageCommittee } from "../../domain/permissions";
import { CommitteeNotFoundError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";

export interface ArchiveCommitteeInput {
  actor: AuthenticatedActor;
  committeeId: string;
}

/** Soft only — flips status to ARCHIVED, never deletes the row or its memberships (§5: "do not destroy previous-year records"). */
export class ArchiveCommitteeUseCase {
  constructor(
    private readonly deps: {
      committeeRepository: CommitteeRepository;
      committeeMembershipRepository: CommitteeMembershipRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: ArchiveCommitteeInput): Promise<CommitteeRecord> {
    const existing = await this.deps.committeeRepository.findById(input.committeeId);
    if (!existing) throw new CommitteeNotFoundError();

    const memberships = await this.deps.committeeMembershipRepository.listForCommittee(input.committeeId);
    if (!canManageCommittee(input.actor, memberships)) {
      throw new NotAuthorizedError("Not authorized to archive this committee");
    }

    const committee = await this.deps.committeeRepository.setStatus(input.committeeId, "ARCHIVED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_ARCHIVED,
      targetEntityType: "Committee",
      targetEntityId: committee.id,
    });

    return committee;
  }
}
