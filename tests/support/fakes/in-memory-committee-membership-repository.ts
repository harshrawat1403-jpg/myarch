import crypto from "node:crypto";
import type { CommitteeMembershipRecord } from "../../../src/modules/committees";
import type {
  AddCommitteeMembershipData,
  CommitteeMembershipRepository,
  UpdateCommitteeMembershipData,
} from "../../../src/modules/committees/application/ports/committee-membership-repository";

export class InMemoryCommitteeMembershipRepository implements CommitteeMembershipRepository {
  private readonly byId = new Map<string, CommitteeMembershipRecord>();

  seed(record: CommitteeMembershipRecord): void {
    this.byId.set(record.id, record);
  }

  async add(data: AddCommitteeMembershipData): Promise<CommitteeMembershipRecord> {
    const now = new Date();
    const record: CommitteeMembershipRecord = {
      id: crypto.randomUUID(),
      committeeId: data.committeeId,
      userId: data.userId,
      position: data.position ?? null,
      isLead: data.isLead ?? false,
      academicYear: data.academicYear ?? null,
      isActive: true,
      startDate: now,
      endDate: null,
      createdAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<CommitteeMembershipRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findActiveByCommitteeAndUser(committeeId: string, userId: string): Promise<CommitteeMembershipRecord | null> {
    return (
      [...this.byId.values()].find((m) => m.committeeId === committeeId && m.userId === userId && m.isActive) ?? null
    );
  }

  private mustGet(id: string): CommitteeMembershipRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No committee membership with id ${id}`);
    return existing;
  }

  async update(id: string, data: UpdateCommitteeMembershipData): Promise<CommitteeMembershipRecord> {
    const existing = this.mustGet(id);
    const updated: CommitteeMembershipRecord = {
      ...existing,
      ...(data.position !== undefined ? { position: data.position } : {}),
      ...(data.isLead !== undefined ? { isLead: data.isLead } : {}),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async end(id: string): Promise<CommitteeMembershipRecord> {
    const existing = this.mustGet(id);
    const updated: CommitteeMembershipRecord = { ...existing, isActive: false, endDate: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async listForCommittee(committeeId: string): Promise<CommitteeMembershipRecord[]> {
    return [...this.byId.values()].filter((m) => m.committeeId === committeeId);
  }

  async listActiveForUser(userId: string): Promise<CommitteeMembershipRecord[]> {
    return [...this.byId.values()].filter((m) => m.userId === userId && m.isActive);
  }
}
