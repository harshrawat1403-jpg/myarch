import type { AuthenticatedActor } from "@/modules/auth";
import { canChangeBatchLifecycleStatus } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { TransitionPlan } from "../../domain/entities";
import { InvalidConfirmationTextError } from "../../domain/errors";
import type { AcademicYearTransitionRunRepository } from "../ports/academic-year-transition-run-repository";

export const ACADEMIC_YEAR_TRANSITION_JOB_TYPE = "ACADEMIC_YEAR_TRANSITION";

/** The payload enqueued for an ACADEMIC_YEAR_TRANSITION job — just the run id; the whole feature is Secretary-only, so the job handler reconstructs a plain Secretary actor rather than needing role/scope embedded (contrast BulkImportStudentsJobPayload, which also serves Coordinators). */
export interface AcademicYearTransitionJobPayload {
  readonly runId: string;
}

export interface StartAcademicYearTransitionInput {
  actor: AuthenticatedActor;
  plan: TransitionPlan;
  confirmationText: string;
}

export interface StartAcademicYearTransitionResult {
  runId: string;
}

export interface StartAcademicYearTransitionUseCaseDeps {
  runRepository: AcademicYearTransitionRunRepository;
  auditRecorder: AuditRecorder;
  dispatchJob(payload: AcademicYearTransitionJobPayload): Promise<{ jobId: string }>;
}

/**
 * Requires the Secretary to type "CONFIRM" exactly — given the blast
 * radius (batch status changes affecting recruiter visibility, a new
 * batch, coordinator reassignments), a standard Confirm/Cancel dialog is
 * not a strong enough gate. Freezes the given plan onto a new
 * AcademicYearTransitionRun and dispatches the job that executes it —
 * never re-derives the plan itself.
 */
export class StartAcademicYearTransitionUseCase {
  constructor(private readonly deps: StartAcademicYearTransitionUseCaseDeps) {}

  async execute(input: StartAcademicYearTransitionInput): Promise<StartAcademicYearTransitionResult> {
    if (!canChangeBatchLifecycleStatus(input.actor)) {
      throw new NotAuthorizedError("Not authorized to run an academic year transition");
    }
    if (input.confirmationText !== "CONFIRM") {
      throw new InvalidConfirmationTextError();
    }

    const run = await this.deps.runRepository.create({ actorUserId: input.actor.userId, plan: input.plan });

    await this.deps.dispatchJob({ runId: run.id });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ACADEMIC_YEAR_TRANSITION_STARTED,
      targetEntityType: "AcademicYearTransitionRun",
      targetEntityId: run.id,
      metadata: {
        graduationCount: input.plan.graduations.length,
        archivalCount: input.plan.archivals.length,
        newIntake: input.plan.newIntake.name,
      },
    });

    return { runId: run.id };
  }
}
