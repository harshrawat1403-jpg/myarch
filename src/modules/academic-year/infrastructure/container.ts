import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { jobDispatcher, jobRegistry } from "@/modules/jobs";
import { createBatchUseCase, updateBatchStatusUseCase } from "@/modules/batches";
import { assignBatchUseCase } from "@/modules/coordinators";
import { ComputeTransitionPlanUseCase } from "../application/use-cases/compute-transition-plan";
import {
  StartAcademicYearTransitionUseCase,
  ACADEMIC_YEAR_TRANSITION_JOB_TYPE,
} from "../application/use-cases/start-academic-year-transition";
import { GetAcademicYearTransitionRunUseCase } from "../application/use-cases/get-academic-year-transition-run";
import { PrismaAcademicYearTransitionRunRepository } from "./prisma-academic-year-transition-run-repository";
import { PrismaAcademicYearReferenceRepository } from "./prisma-academic-year-reference-repository";
import { AcademicYearTransitionJobHandler } from "./academic-year-transition-job-handler";

// No secrets required — safe to construct eagerly.
const runRepository = new PrismaAcademicYearTransitionRunRepository(prisma);
const referenceRepository = new PrismaAcademicYearReferenceRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const computeTransitionPlanUseCase = new ComputeTransitionPlanUseCase({ referenceRepository });
export const getAcademicYearTransitionRunUseCase = new GetAcademicYearTransitionRunUseCase({ runRepository });
export const startAcademicYearTransitionUseCase = new StartAcademicYearTransitionUseCase({
  runRepository,
  auditRecorder,
  dispatchJob: (payload) =>
    jobDispatcher.dispatch(ACADEMIC_YEAR_TRANSITION_JOB_TYPE, payload as unknown as Record<string, unknown>, {
      maxAttempts: 1,
    }),
});

/**
 * Registers this module's ACADEMIC_YEAR_TRANSITION handler into the shared
 * JobRegistry. Must be called once by whatever process actually runs a
 * JobWorker (scripts/run-worker.ts) — never a side effect of importing this
 * file, mirroring notifications'/students' registerJobHandlers(). Idempotent.
 */
export function registerAcademicYearJobHandlers(): void {
  if (jobRegistry.has(ACADEMIC_YEAR_TRANSITION_JOB_TYPE)) {
    return;
  }
  jobRegistry.register(
    new AcademicYearTransitionJobHandler({
      runRepository,
      auditRecorder,
      createBatch: (input) => createBatchUseCase.execute(input),
      updateBatchStatus: (input) => updateBatchStatusUseCase.execute(input),
      assignBatch: (input) => assignBatchUseCase.execute(input),
    }),
  );
}
