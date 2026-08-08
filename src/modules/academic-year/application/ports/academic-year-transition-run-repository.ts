import type {
  AcademicYearTransitionRunRecord,
  AcademicYearTransitionStatus,
  TransitionPlan,
  TransitionStepLogEntry,
} from "../../domain/entities";

export interface CreateAcademicYearTransitionRunData {
  actorUserId: string;
  plan: TransitionPlan;
}

export interface AcademicYearTransitionRunRepository {
  create(data: CreateAcademicYearTransitionRunData): Promise<AcademicYearTransitionRunRecord>;
  findById(id: string): Promise<AcademicYearTransitionRunRecord | null>;
  markRunning(id: string): Promise<AcademicYearTransitionRunRecord>;
  appendStepLog(id: string, entry: TransitionStepLogEntry): Promise<AcademicYearTransitionRunRecord>;
  complete(id: string, status: Extract<AcademicYearTransitionStatus, "COMPLETED" | "FAILED">): Promise<AcademicYearTransitionRunRecord>;
  /** Total failure — the job itself couldn't run, not a per-step failure already captured in stepLog. */
  markFailed(id: string, message: string): Promise<AcademicYearTransitionRunRecord>;
}
