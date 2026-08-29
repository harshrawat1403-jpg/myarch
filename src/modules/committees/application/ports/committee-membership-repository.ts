import type { CommitteeMembershipRecord } from "../../domain/entities";

export interface AddCommitteeMembershipData {
  committeeId: string;
  userId: string;
  position?: string | null;
  isLead?: boolean;
  academicYear?: string | null;
}

export interface UpdateCommitteeMembershipData {
  position?: string | null;
  isLead?: boolean;
}

export interface CommitteeMembershipRepository {
  add(data: AddCommitteeMembershipData): Promise<CommitteeMembershipRecord>;
  findById(id: string): Promise<CommitteeMembershipRecord | null>;
  /** Active membership only — a former (isActive: false) row never blocks re-adding the same user. */
  findActiveByCommitteeAndUser(committeeId: string, userId: string): Promise<CommitteeMembershipRecord | null>;
  update(id: string, data: UpdateCommitteeMembershipData): Promise<CommitteeMembershipRecord>;
  /** Soft-close only — sets isActive: false and endDate: now(). Never deletes the row (§5: "preserve historical membership"). */
  end(id: string): Promise<CommitteeMembershipRecord>;
  /** Every membership ever recorded — active and former — so a committee's full historical roster is always retrievable. */
  listForCommittee(committeeId: string): Promise<CommitteeMembershipRecord[]>;
  listActiveForUser(userId: string): Promise<CommitteeMembershipRecord[]>;
}
