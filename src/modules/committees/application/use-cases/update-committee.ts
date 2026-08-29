import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CommitteeRecord } from "../../domain/entities";
import { canManageCommittee } from "../../domain/permissions";
import { CommitteeNotFoundError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";

export interface UpdateCommitteeInput {
  actor: AuthenticatedActor;
  committeeId: string;
  name?: string;
  academicYear?: string | null;
  responsibilities?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export class UpdateCommitteeUseCase {
  constructor(
    private readonly deps: {
      committeeRepository: CommitteeRepository;
      committeeMembershipRepository: CommitteeMembershipRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: UpdateCommitteeInput): Promise<CommitteeRecord> {
    const existing = await this.deps.committeeRepository.findById(input.committeeId);
    if (!existing) throw new CommitteeNotFoundError();

    const memberships = await this.deps.committeeMembershipRepository.listForCommittee(input.committeeId);
    if (!canManageCommittee(input.actor, memberships)) {
      throw new NotAuthorizedError("Not authorized to manage this committee");
    }

    const committee = await this.deps.committeeRepository.update(input.committeeId, {
      name: input.name?.trim(),
      academicYear: input.academicYear === undefined ? undefined : (input.academicYear?.trim() ?? null),
      responsibilities: input.responsibilities === undefined ? undefined : (input.responsibilities?.trim() ?? null),
      startDate: input.startDate,
      endDate: input.endDate,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_UPDATED,
      targetEntityType: "Committee",
      targetEntityId: committee.id,
    });

    return committee;
  }
}
