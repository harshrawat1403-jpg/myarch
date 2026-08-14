import crypto from "node:crypto";
import type { RegistrationRequestRecord, RegistrationRequestSearchFilters } from "../../../src/modules/registration";
import type {
  CreateRegistrationRequestData,
  DecideRegistrationRequestData,
  MarkRegistrationRequestData,
  RegistrationRequestRepository,
} from "../../../src/modules/registration/application/ports/registration-request-repository";

const PENDING_STATUSES: RegistrationRequestRecord["status"][] = ["SUBMITTED", "REVIEWED", "NEEDS_ATTENTION"];

export class InMemoryRegistrationRequestRepository implements RegistrationRequestRepository {
  private readonly byId = new Map<string, RegistrationRequestRecord>();

  seed(record: RegistrationRequestRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateRegistrationRequestData): Promise<RegistrationRequestRecord> {
    const now = new Date();
    const record: RegistrationRequestRecord = {
      id: crypto.randomUUID(),
      email: data.email,
      fullName: data.fullName,
      rollNumber: data.rollNumber,
      batchId: data.batchId,
      submittedData: data.submittedData,
      status: "SUBMITTED",
      emailVerifiedAt: null,
      coordinatorComment: null,
      reviewedByUserId: null,
      reviewedAt: null,
      decidedByUserId: null,
      decidedAt: null,
      rejectionReason: null,
      resultingStudentProfileId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<RegistrationRequestRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async hasPendingByEmail(email: string): Promise<boolean> {
    return [...this.byId.values()].some(
      (r) => r.email.toLowerCase() === email.toLowerCase() && PENDING_STATUSES.includes(r.status),
    );
  }

  async hasPendingByRollNumber(rollNumber: string): Promise<boolean> {
    return [...this.byId.values()].some(
      (r) => r.rollNumber.toLowerCase() === rollNumber.toLowerCase() && PENDING_STATUSES.includes(r.status),
    );
  }

  async search(filters: RegistrationRequestSearchFilters): Promise<RegistrationRequestRecord[]> {
    return [...this.byId.values()].filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.batchId && r.batchId !== filters.batchId) return false;
      if (filters.batchIds && !filters.batchIds.includes(r.batchId)) return false;
      return true;
    });
  }

  async mark(id: string, data: MarkRegistrationRequestData): Promise<RegistrationRequestRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: RegistrationRequestRecord = {
      ...existing,
      status: data.status,
      coordinatorComment: data.coordinatorComment,
      reviewedByUserId: data.reviewedByUserId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async decide(id: string, data: DecideRegistrationRequestData): Promise<RegistrationRequestRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: RegistrationRequestRecord = {
      ...existing,
      status: data.status,
      decidedByUserId: data.decidedByUserId,
      decidedAt: new Date(),
      rejectionReason: data.rejectionReason ?? null,
      resultingStudentProfileId: data.resultingStudentProfileId ?? null,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async markEmailVerified(id: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, emailVerifiedAt: new Date() });
  }
}
