import type { AuthenticatedActor } from "@/modules/auth";
import { canChangeBatchLifecycleStatus } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { TransitionPlan } from "../../domain/entities";
import {
  BatchNotEligibleForArchivalError,
  BatchNotEligibleForGraduationError,
  TransitionBatchNotFoundError,
  TransitionCoordinatorNotFoundError,
} from "../../domain/errors";
import type { AcademicYearReferenceRepository } from "../ports/academic-year-reference-repository";

export interface ComputeTransitionPlanInput {
  actor: AuthenticatedActor;
  graduateBatchIds: readonly string[];
  archiveBatchIds: readonly string[];
  newIntake: { name: string; year: number };
  coordinatorIds: readonly string[];
}

/**
 * Pure, read-only: validates every id in the Secretary's selections against
 * current state and shapes a TransitionPlan with human-readable names for
 * the Review step — never persists anything. StartAcademicYearTransitionUseCase
 * is what freezes a plan onto a run.
 */
export class ComputeTransitionPlanUseCase {
  constructor(private readonly deps: { referenceRepository: AcademicYearReferenceRepository }) {}

  async execute(input: ComputeTransitionPlanInput): Promise<TransitionPlan> {
    if (!canChangeBatchLifecycleStatus(input.actor)) {
      throw new NotAuthorizedError("Not authorized to run an academic year transition");
    }

    const graduations = await Promise.all(
      input.graduateBatchIds.map(async (batchId) => {
        const batch = await this.deps.referenceRepository.findBatchById(batchId);
        if (!batch) throw new TransitionBatchNotFoundError();
        if (batch.status !== "ACTIVE") throw new BatchNotEligibleForGraduationError(batch.name);
        return { batchId: batch.id, batchName: batch.name, fromStatus: batch.status, toStatus: "GRADUATED" as const };
      }),
    );

    const archivals = await Promise.all(
      input.archiveBatchIds.map(async (batchId) => {
        const batch = await this.deps.referenceRepository.findBatchById(batchId);
        if (!batch) throw new TransitionBatchNotFoundError();
        if (batch.status !== "GRADUATED") throw new BatchNotEligibleForArchivalError(batch.name);
        return { batchId: batch.id, batchName: batch.name, fromStatus: batch.status, toStatus: "ARCHIVED" as const };
      }),
    );

    const coordinatorAssignments = await Promise.all(
      input.coordinatorIds.map(async (coordinatorId) => {
        const coordinator = await this.deps.referenceRepository.findCoordinatorById(coordinatorId);
        if (!coordinator) throw new TransitionCoordinatorNotFoundError();
        return { coordinatorId: coordinator.id, coordinatorName: coordinator.fullName };
      }),
    );

    return {
      graduations,
      archivals,
      newIntake: { name: input.newIntake.name.trim(), year: input.newIntake.year },
      coordinatorAssignments,
    };
  }
}
