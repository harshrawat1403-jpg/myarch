import crypto from "node:crypto";
import type {
  RecruiterAccountRecord,
  RecruiterAccountSearchFilters,
  RecruiterApprovalStatus,
} from "../../../src/modules/recruiters";
import type {
  CreateRecruiterAccountData,
  RecruiterAccountRepository,
  UpdateRecruiterAccountData,
} from "../../../src/modules/recruiters/application/ports/recruiter-account-repository";

export class InMemoryRecruiterAccountRepository implements RecruiterAccountRepository {
  private readonly byId = new Map<string, RecruiterAccountRecord>();

  seed(record: RecruiterAccountRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateRecruiterAccountData): Promise<RecruiterAccountRecord> {
    const record: RecruiterAccountRecord = {
      id: crypto.randomUUID(),
      userId: data.userId,
      email: `seeded-${data.userId}@example.com`,
      fullName: data.fullName,
      companyName: data.companyName,
      isActive: true,
      approvalStatus: data.approvalStatus ?? "APPROVED",
      createdAt: new Date(),
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<RecruiterAccountRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async update(id: string, data: UpdateRecruiterAccountData): Promise<RecruiterAccountRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = {
      ...existing,
      fullName: data.fullName ?? existing.fullName,
      companyName: data.companyName ?? existing.companyName,
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setActive(id: string, isActive: boolean): Promise<RecruiterAccountRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, isActive };
    this.byId.set(id, updated);
    return updated;
  }

  async setApprovalStatus(id: string, status: RecruiterApprovalStatus): Promise<RecruiterAccountRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, approvalStatus: status };
    this.byId.set(id, updated);
    return updated;
  }

  async approveAndActivate(id: string): Promise<RecruiterAccountRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: RecruiterAccountRecord = { ...existing, approvalStatus: "APPROVED", isActive: true };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: RecruiterAccountSearchFilters): Promise<RecruiterAccountRecord[]> {
    return [...this.byId.values()].filter((record) => {
      if (!filters.includeInactive && !record.isActive) return false;
      if (filters.name && !record.fullName.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.approvalStatus && record.approvalStatus !== filters.approvalStatus) return false;
      return true;
    });
  }
}
