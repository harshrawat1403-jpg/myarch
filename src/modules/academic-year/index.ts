/**
 * Public exports of the academic-year module. Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  AcademicYearTransitionStatus,
  TransitionBatchAction,
  TransitionNewIntake,
  TransitionCoordinatorAssignment,
  TransitionPlan,
  TransitionStepLogEntry,
  AcademicYearTransitionRunRecord,
} from "./domain/entities";
export {
  BatchNotEligibleForGraduationError,
  BatchNotEligibleForArchivalError,
  TransitionBatchNotFoundError,
  TransitionCoordinatorNotFoundError,
  InvalidConfirmationTextError,
  AcademicYearTransitionRunNotFoundError,
} from "./domain/errors";

export { computeTransitionPlanRouteHandler } from "./presentation/route-handlers/compute-plan";
export { startAcademicYearTransitionRouteHandler } from "./presentation/route-handlers/start";
export { getAcademicYearTransitionRunRouteHandler } from "./presentation/route-handlers/get-run";

// Registers this module's background job handler (ACADEMIC_YEAR_TRANSITION)
// — called once by scripts/run-worker.ts, never at import time.
export { registerAcademicYearJobHandlers } from "./infrastructure/container";
