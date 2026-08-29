import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { CommitteeAttachmentRecord, CommitteeMembershipRecord, CommitteeRecord } from "../../domain/entities";
import { canViewCommittee } from "../../domain/permissions";
import { CommitteeNotFoundError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";
import type { CommitteeAttachmentRepository } from "../ports/committee-attachment-repository";

export interface GetCommitteeInput {
  actor: AuthenticatedActor;
  committeeId: string;
}

export interface CommitteeDetail {
  committee: CommitteeRecord;
  memberships: CommitteeMembershipRecord[];
  attachments: CommitteeAttachmentRecord[];
}

/** Committees are broadly visible (canViewCommittee — everyone except RECRUITER); the full historical roster (active + former) is always included, not just current members. */
export class GetCommitteeUseCase {
  constructor(
    private readonly deps: {
      committeeRepository: CommitteeRepository;
      committeeMembershipRepository: CommitteeMembershipRepository;
      committeeAttachmentRepository: CommitteeAttachmentRepository;
    },
  ) {}

  async execute(input: GetCommitteeInput): Promise<CommitteeDetail> {
    if (!canViewCommittee(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view this committee");
    }

    const committee = await this.deps.committeeRepository.findById(input.committeeId);
    if (!committee) throw new CommitteeNotFoundError();

    const [memberships, attachments] = await Promise.all([
      this.deps.committeeMembershipRepository.listForCommittee(committee.id),
      this.deps.committeeAttachmentRepository.listForCommittee(committee.id),
    ]);

    return { committee, memberships, attachments };
  }
}
