import type { BatchStatus } from "@/modules/batches";

/**
 * V3.0 Administration Platform: Academic Year Transition Wizard —
 * Secretary-only, orchestrates existing batches/coordinators/students
 * use cases according to a plan the Secretary explicitly reviewed and
 * confirmed. Framework-free Domain layer types only.
 */

export type AcademicYearTransitionStatus = "DRAFT" | "PENDING_CONFIRMATION" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface TransitionBatchAction {
  readonly batchId: string;
  readonly batchName: string;
  readonly fromStatus: BatchStatus;
  readonly toStatus: BatchStatus;
}

export interface TransitionNewIntake {
  readonly name: string;
  readonly year: number;
}

export interface TransitionCoordinatorAssignment {
  readonly coordinatorId: string;
  readonly coordinatorName: string;
}

/**
 * The frozen plan a Secretary reviewed and confirmed. Once persisted onto
 * an AcademicYearTransitionRun, the job handler executes exactly this —
 * never a re-derived plan — so nothing can drift between review and
 * execution (e.g. a batch's status changing out from under an in-flight run).
 */
export interface TransitionPlan {
  readonly graduations: readonly TransitionBatchAction[];
  readonly archivals: readonly TransitionBatchAction[];
  readonly newIntake: TransitionNewIntake;
  readonly coordinatorAssignments: readonly TransitionCoordinatorAssignment[];
}

export interface TransitionStepLogEntry {
  readonly step: string;
  readonly status: "COMPLETED" | "FAILED";
  readonly detail?: string;
  readonly occurredAt: string;
}

export interface AcademicYearTransitionRunRecord {
  readonly id: string;
  readonly actorUserId: string;
  readonly status: AcademicYearTransitionStatus;
  readonly plan: TransitionPlan;
  readonly stepLog: readonly TransitionStepLogEntry[];
  readonly currentStep: string | null;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly errorMessage: string | null;
}
