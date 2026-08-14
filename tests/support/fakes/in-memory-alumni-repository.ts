import crypto from "node:crypto";
import type { AlumniApprovalStatus, AlumniRecord, AlumniSearchFilters } from "../../../src/modules/alumni/domain/entities";
import type {
  AlumniRepository,
  CreateAlumniData,
  UpdateAlumniData,
} from "../../../src/modules/alumni/application/ports/alumni-repository";
import { AlumniNotFoundError, DuplicateAlumniLinkError } from "../../../src/modules/alumni/domain/errors";

export class InMemoryAlumniRepository implements AlumniRepository {
  private readonly byId = new Map<string, AlumniRecord>();

  seed(record: AlumniRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateAlumniData): Promise<AlumniRecord> {
    if (data.studentProfileId) {
      const duplicate = [...this.byId.values()].some((a) => a.studentProfileId === data.studentProfileId);
      if (duplicate) throw new DuplicateAlumniLinkError();
    }
    const now = new Date();
    const record: AlumniRecord = {
      id: crypto.randomUUID(),
      studentProfileId: data.studentProfileId ?? null,
      userId: data.userId ?? null,
      fullName: data.fullName,
      graduationYear: data.graduationYear,
      currentCompany: data.currentCompany ?? null,
      designation: data.designation ?? null,
      location: data.location ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
      linkedInUrl: data.linkedInUrl ?? null,
      mentorshipAvailable: data.mentorshipAvailable ?? false,
      approvalStatus: data.approvalStatus ?? "APPROVED",
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<AlumniRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async update(id: string, data: UpdateAlumniData): Promise<AlumniRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No alumni record with id ${id}`);
    const updated: AlumniRecord = {
      ...existing,
      fullName: data.fullName ?? existing.fullName,
      graduationYear: data.graduationYear ?? existing.graduationYear,
      currentCompany: data.currentCompany !== undefined ? data.currentCompany : existing.currentCompany,
      designation: data.designation !== undefined ? data.designation : existing.designation,
      location: data.location !== undefined ? data.location : existing.location,
      portfolioUrl: data.portfolioUrl !== undefined ? data.portfolioUrl : existing.portfolioUrl,
      linkedInUrl: data.linkedInUrl !== undefined ? data.linkedInUrl : existing.linkedInUrl,
      mentorshipAvailable: data.mentorshipAvailable ?? existing.mentorshipAvailable,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async setApprovalStatus(id: string, status: AlumniApprovalStatus): Promise<AlumniRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new AlumniNotFoundError();
    const updated = { ...existing, approvalStatus: status };
    this.byId.set(id, updated);
    return updated;
  }

  async approveAndActivate(id: string): Promise<AlumniRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new AlumniNotFoundError();
    const updated: AlumniRecord = { ...existing, approvalStatus: "APPROVED" };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: AlumniSearchFilters): Promise<AlumniRecord[]> {
    return [...this.byId.values()].filter((a) => {
      if (filters.name && !a.fullName.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.graduationYear !== undefined && a.graduationYear !== filters.graduationYear) return false;
      if (filters.mentorshipAvailable !== undefined && a.mentorshipAvailable !== filters.mentorshipAvailable) return false;
      if (filters.approvalStatus && a.approvalStatus !== filters.approvalStatus) return false;
      return true;
    });
  }
}
