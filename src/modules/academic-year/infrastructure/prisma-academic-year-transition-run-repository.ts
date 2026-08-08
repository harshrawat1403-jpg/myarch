import type {
  AcademicYearTransitionRun as PrismaAcademicYearTransitionRun,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type {
  AcademicYearTransitionRunRecord,
  AcademicYearTransitionStatus,
  TransitionPlan,
  TransitionStepLogEntry,
} from "../domain/entities";
import type {
  AcademicYearTransitionRunRepository,
  CreateAcademicYearTransitionRunData,
} from "../application/ports/academic-year-transition-run-repository";

export class PrismaAcademicYearTransitionRunRepository implements AcademicYearTransitionRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAcademicYearTransitionRunData): Promise<AcademicYearTransitionRunRecord> {
    const row = await this.prisma.academicYearTransitionRun.create({
      data: {
        actorUserId: data.actorUserId,
        planJson: data.plan as unknown as Prisma.InputJsonValue,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<AcademicYearTransitionRunRecord | null> {
    const row = await this.prisma.academicYearTransitionRun.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async markRunning(id: string): Promise<AcademicYearTransitionRunRecord> {
    const row = await this.prisma.academicYearTransitionRun.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return toDomain(row);
  }

  async appendStepLog(id: string, entry: TransitionStepLogEntry): Promise<AcademicYearTransitionRunRecord> {
    // Read-modify-write on the JSON stepLog column — safe because a single
    // run is only ever processed by one job, executed sequentially by one
    // worker at a time (the same reasoning as
    // PrismaBulkImportRunRepository.recordRowFailure).
    const existing = await this.prisma.academicYearTransitionRun.findUniqueOrThrow({ where: { id } });
    const stepLog = [...(existing.stepLog as unknown as TransitionStepLogEntry[]), entry];
    const row = await this.prisma.academicYearTransitionRun.update({
      where: { id },
      data: { stepLog: stepLog as unknown as Prisma.InputJsonValue, currentStep: entry.step },
    });
    return toDomain(row);
  }

  async complete(
    id: string,
    status: Extract<AcademicYearTransitionStatus, "COMPLETED" | "FAILED">,
  ): Promise<AcademicYearTransitionRunRecord> {
    const row = await this.prisma.academicYearTransitionRun.update({
      where: { id },
      data: { status, completedAt: new Date(), currentStep: null },
    });
    return toDomain(row);
  }

  async markFailed(id: string, message: string): Promise<AcademicYearTransitionRunRecord> {
    const row = await this.prisma.academicYearTransitionRun.update({
      where: { id },
      data: { status: "FAILED", completedAt: new Date(), errorMessage: message },
    });
    return toDomain(row);
  }
}

function toDomain(row: PrismaAcademicYearTransitionRun): AcademicYearTransitionRunRecord {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    status: row.status,
    plan: row.planJson as unknown as TransitionPlan,
    stepLog: row.stepLog as unknown as TransitionStepLogEntry[],
    currentStep: row.currentStep,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  };
}
