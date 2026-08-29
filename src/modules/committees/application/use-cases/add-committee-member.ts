import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { CommitteeMembershipRecord } from "../../domain/entities";
import { canManageCommittee } from "../../domain/permissions";
import { CommitteeNotFoundError, DuplicateCommitteeMembershipError } from "../../domain/errors";
import type { CommitteeRepository } from "../ports/committee-repository";
import type { CommitteeMembershipRepository } from "../ports/committee-membership-repository";

export interface AddCommitteeMemberInput {
  actor: AuthenticatedActor;
  committeeId: string;
  userId: string;
  position?: string | null;
  isLead?: boolean;
  academicYear?: string | null;
}

export class AddCommitteeMemberUseCase {
  constructor(
    private readonly deps: {
      committeeRepository: CommitteeRepository;
      committeeMembershipRepository: CommitteeMembershipRepository;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: AddCommitteeMemberInput): Promise<CommitteeMembershipRecord> {
    const committee = await this.deps.committeeRepository.findById(input.committeeId);
    if (!committee) throw new CommitteeNotFoundError();

    const memberships = await this.deps.committeeMembershipRepository.listForCommittee(input.committeeId);
    if (!canManageCommittee(input.actor, memberships)) {
      throw new NotAuthorizedError("Not authorized to manage this committee's members");
    }

    const existing = await this.deps.committeeMembershipRepository.findActiveByCommitteeAndUser(
      input.committeeId,
      input.userId,
    );
    if (existing) throw new DuplicateCommitteeMembershipError();

    const membership = await this.deps.committeeMembershipRepository.add({
      committeeId: input.committeeId,
      userId: input.userId,
      position: input.position?.trim() ?? null,
      isLead: input.isLead ?? false,
      academicYear: input.academicYear?.trim() ?? null,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMMITTEE_MEMBER_ADDED,
      targetEntityType: "Committee",
      targetEntityId: input.committeeId,
      metadata: { userId: input.userId, position: membership.position },
    });

    await this.deps.notificationService.notify({
      recipientUserId: input.userId,
      template: "COMMITTEE_MEMBER_ADDED",
      context: { committeeId: committee.id, committeeName: committee.name, position: membership.position },
    });

    return membership;
  }
}
