import type { Application as PrismaApplication, ApplicationStatusEvent as PrismaEvent, PrismaClient } from "@prisma/client";
import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusEventRecord,
  InterviewMode,
} from "../domain/entities";
import type { ApplicationRepository } from "../application/ports/application-repository";

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(studentProfileId: string, placementDriveId: string): Promise<ApplicationRecord> {
    const row = await this.prisma.application.create({
      data: { studentProfileId, placementDriveId },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<ApplicationRecord | null> {
    const row = await this.prisma.application.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByStudentAndDrive(studentProfileId: string, placementDriveId: string): Promise<ApplicationRecord | null> {
    const row = await this.prisma.application.findUnique({
      where: { studentProfileId_placementDriveId: { studentProfileId, placementDriveId } },
    });
    return row ? toDomain(row) : null;
  }

  async listForStudent(studentProfileId: string): Promise<ApplicationRecord[]> {
    const rows = await this.prisma.application.findMany({
      where: { studentProfileId },
      orderBy: { appliedAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async listForDrive(placementDriveId: string): Promise<ApplicationRecord[]> {
    const rows = await this.prisma.application.findMany({
      where: { placementDriveId },
      orderBy: { appliedAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async transitionStatus(
    applicationId: string,
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    changedByUserId: string,
    note: string | null,
  ): Promise<ApplicationRecord> {
    const [updated] = await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { currentStatus: toStatus },
      }),
      this.prisma.applicationStatusEvent.create({
        data: { applicationId, fromStatus, toStatus, note, changedByUserId },
      }),
    ]);
    return toDomain(updated);
  }

  async scheduleInterview(applicationId: string, scheduledAt: Date, mode: InterviewMode): Promise<ApplicationRecord> {
    const row = await this.prisma.application.update({
      where: { id: applicationId },
      data: { interviewScheduledAt: scheduledAt, interviewMode: mode },
    });
    return toDomain(row);
  }

  async listStatusEvents(applicationId: string): Promise<ApplicationStatusEventRecord[]> {
    const rows = await this.prisma.applicationStatusEvent.findMany({
      where: { applicationId },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toEventDomain);
  }
}

function toDomain(row: PrismaApplication): ApplicationRecord {
  return {
    id: row.id,
    studentProfileId: row.studentProfileId,
    placementDriveId: row.placementDriveId,
    currentStatus: row.currentStatus,
    currentRound: row.currentRound,
    interviewScheduledAt: row.interviewScheduledAt,
    interviewMode: row.interviewMode,
    appliedAt: row.appliedAt,
    updatedAt: row.updatedAt,
  };
}

function toEventDomain(row: PrismaEvent): ApplicationStatusEventRecord {
  return {
    id: row.id,
    applicationId: row.applicationId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    note: row.note,
    changedByUserId: row.changedByUserId,
    occurredAt: row.occurredAt,
  };
}
