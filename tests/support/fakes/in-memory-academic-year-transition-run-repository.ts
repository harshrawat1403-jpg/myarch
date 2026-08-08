import crypto from "node:crypto";
import type {
  AcademicYearTransitionRunRecord,
  AcademicYearTransitionStatus,
  TransitionStepLogEntry,
} from "../../../src/modules/academic-year";
import type {
  AcademicYearTransitionRunRepository,
  CreateAcademicYearTransitionRunData,
} from "../../../src/modules/academic-year/application/ports/academic-year-transition-run-repository";

export class InMemoryAcademicYearTransitionRunRepository implements AcademicYearTransitionRunRepository {
  private readonly byId = new Map<string, AcademicYearTransitionRunRecord>();

  seed(record: AcademicYearTransitionRunRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateAcademicYearTransitionRunData): Promise<AcademicYearTransitionRunRecord> {
    const record: AcademicYearTransitionRunRecord = {
      id: crypto.randomUUID(),
      actorUserId: data.actorUserId,
      status: "DRAFT",
      plan: data.plan,
      stepLog: [],
      currentStep: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<AcademicYearTransitionRunRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private update(id: string, patch: Partial<AcademicYearTransitionRunRecord>): AcademicYearTransitionRunRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, ...patch };
    this.byId.set(id, updated);
    return updated;
  }

  async markRunning(id: string): Promise<AcademicYearTransitionRunRecord> {
    return this.update(id, { status: "RUNNING", startedAt: new Date() });
  }

  async appendStepLog(id: string, entry: TransitionStepLogEntry): Promise<AcademicYearTransitionRunRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    return this.update(id, { stepLog: [...existing.stepLog, entry], currentStep: entry.step });
  }

  async complete(
    id: string,
    status: Extract<AcademicYearTransitionStatus, "COMPLETED" | "FAILED">,
  ): Promise<AcademicYearTransitionRunRecord> {
    return this.update(id, { status, completedAt: new Date(), currentStep: null });
  }

  async markFailed(id: string, message: string): Promise<AcademicYearTransitionRunRecord> {
    return this.update(id, { status: "FAILED", completedAt: new Date(), errorMessage: message });
  }
}
