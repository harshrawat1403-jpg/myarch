import crypto from "node:crypto";
import type { InternshipOutcomeRecord } from "../../../src/modules/placements/domain/entities";
import type { InternshipOutcomeRepository } from "../../../src/modules/placements/application/ports/internship-outcome-repository";

export class InMemoryInternshipOutcomeRepository implements InternshipOutcomeRepository {
  private readonly byApplicationId = new Map<string, InternshipOutcomeRecord>();

  seed(record: InternshipOutcomeRecord): void {
    this.byApplicationId.set(record.applicationId, record);
  }

  async create(applicationId: string): Promise<InternshipOutcomeRecord> {
    const now = new Date();
    const record: InternshipOutcomeRecord = {
      id: crypto.randomUUID(),
      applicationId,
      certificateFileId: null,
      companyFeedback: null,
      studentFeedback: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byApplicationId.set(applicationId, record);
    return record;
  }

  async findByApplicationId(applicationId: string): Promise<InternshipOutcomeRecord | null> {
    return this.byApplicationId.get(applicationId) ?? null;
  }

  private update(applicationId: string, patch: Partial<InternshipOutcomeRecord>): InternshipOutcomeRecord {
    const existing = this.byApplicationId.get(applicationId);
    if (!existing) throw new Error(`No internship outcome for application ${applicationId}`);
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.byApplicationId.set(applicationId, updated);
    return updated;
  }

  async setCompanyFeedback(applicationId: string, companyFeedback: string): Promise<InternshipOutcomeRecord> {
    return this.update(applicationId, { companyFeedback });
  }

  async setStudentFeedback(applicationId: string, studentFeedback: string): Promise<InternshipOutcomeRecord> {
    return this.update(applicationId, { studentFeedback });
  }

  async setCertificateFileId(applicationId: string, certificateFileId: string | null): Promise<InternshipOutcomeRecord> {
    return this.update(applicationId, { certificateFileId });
  }

  async setCompletedAt(applicationId: string, completedAt: Date): Promise<InternshipOutcomeRecord> {
    return this.update(applicationId, { completedAt });
  }
}
