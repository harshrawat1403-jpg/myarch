import crypto from "node:crypto";
import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusEventRecord,
  InterviewMode,
} from "../../../src/modules/placements/domain/entities";
import type { ApplicationRepository } from "../../../src/modules/placements/application/ports/application-repository";

export class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly byId = new Map<string, ApplicationRecord>();
  private readonly events = new Map<string, ApplicationStatusEventRecord[]>();

  seed(record: ApplicationRecord): void {
    this.byId.set(record.id, record);
  }

  async create(studentProfileId: string, placementDriveId: string): Promise<ApplicationRecord> {
    const now = new Date();
    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      studentProfileId,
      placementDriveId,
      currentStatus: "APPLIED",
      currentRound: null,
      interviewScheduledAt: null,
      interviewMode: null,
      appliedAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<ApplicationRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByStudentAndDrive(studentProfileId: string, placementDriveId: string): Promise<ApplicationRecord | null> {
    return (
      [...this.byId.values()].find(
        (a) => a.studentProfileId === studentProfileId && a.placementDriveId === placementDriveId,
      ) ?? null
    );
  }

  async listForStudent(studentProfileId: string): Promise<ApplicationRecord[]> {
    return [...this.byId.values()].filter((a) => a.studentProfileId === studentProfileId);
  }

  async listForDrive(placementDriveId: string): Promise<ApplicationRecord[]> {
    return [...this.byId.values()].filter((a) => a.placementDriveId === placementDriveId);
  }

  async transitionStatus(
    applicationId: string,
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    changedByUserId: string,
    note: string | null,
  ): Promise<ApplicationRecord> {
    const existing = this.byId.get(applicationId);
    if (!existing) throw new Error(`No application with id ${applicationId}`);
    const updated: ApplicationRecord = { ...existing, currentStatus: toStatus, updatedAt: new Date() };
    this.byId.set(applicationId, updated);

    const event: ApplicationStatusEventRecord = {
      id: crypto.randomUUID(),
      applicationId,
      fromStatus,
      toStatus,
      note,
      changedByUserId,
      occurredAt: new Date(),
    };
    this.events.set(applicationId, [...(this.events.get(applicationId) ?? []), event]);

    return updated;
  }

  async scheduleInterview(applicationId: string, scheduledAt: Date, mode: InterviewMode): Promise<ApplicationRecord> {
    const existing = this.byId.get(applicationId);
    if (!existing) throw new Error(`No application with id ${applicationId}`);
    const updated: ApplicationRecord = { ...existing, interviewScheduledAt: scheduledAt, interviewMode: mode };
    this.byId.set(applicationId, updated);
    return updated;
  }

  async listStatusEvents(applicationId: string): Promise<ApplicationStatusEventRecord[]> {
    return this.events.get(applicationId) ?? [];
  }
}
