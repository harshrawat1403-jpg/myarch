import type { JobHandler } from "@/modules/jobs";
import type { AuthenticatedActor } from "@/modules/auth";
import type { Batch, BatchStatus } from "@/modules/batches";
import type { CoordinatorRecord } from "@/modules/coordinators";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { ACADEMIC_YEAR_TRANSITION_JOB_TYPE } from "../application/use-cases/start-academic-year-transition";
import type { AcademicYearTransitionJobPayload } from "../application/use-cases/start-academic-year-transition";
import type { AcademicYearTransitionRunRepository } from "../application/ports/academic-year-transition-run-repository";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

/**
 * Registered against ACADEMIC_YEAR_TRANSITION in the shared JobRegistry
 * (see infrastructure/container.ts's registerAcademicYearJobHandlers()).
 * Executes the frozen plan sequentially — graduate, then archive, then
 * create the new intake batch, then assign coordinators to it — appending
 * one stepLog entry per step so the wizard's execution screen can poll
 * live progress. A failed step does NOT roll back prior steps or abort
 * remaining ones (no cross-aggregate rollback precedent exists anywhere
 * else in this codebase either); the run's final status is FAILED only if
 * at least one step failed, so the Secretary can see exactly what still
 * needs manual attention. Depends on plain functions rather than the
 * concrete batches/coordinators use-case classes, so this module never
 * imports those modules' internals — only their exported, bound behavior.
 */
export class AcademicYearTransitionJobHandler implements JobHandler {
  readonly type = ACADEMIC_YEAR_TRANSITION_JOB_TYPE;

  constructor(
    private readonly deps: {
      runRepository: AcademicYearTransitionRunRepository;
      auditRecorder: AuditRecorder;
      createBatch: (input: { actor: AuthenticatedActor; name: string; year: number }) => Promise<Batch>;
      updateBatchStatus: (input: { actor: AuthenticatedActor; batchId: string; status: BatchStatus }) => Promise<Batch>;
      assignBatch: (input: { actor: AuthenticatedActor; coordinatorId: string; batchId: string }) => Promise<CoordinatorRecord>;
    },
  ) {}

  async handle(rawPayload: Record<string, unknown>): Promise<void> {
    const payload = rawPayload as unknown as AcademicYearTransitionJobPayload;
    const run = await this.deps.runRepository.findById(payload.runId);
    if (!run) return; // Run was deleted/never existed — nothing retryable here.

    await this.deps.runRepository.markRunning(run.id);
    const actor: AuthenticatedActor = { userId: run.actorUserId, role: "SECRETARY" };
    let hasFailure = false;

    for (const graduation of run.plan.graduations) {
      try {
        await this.deps.updateBatchStatus({ actor, batchId: graduation.batchId, status: "GRADUATED" });
        await this.logStep(run.id, `Graduate batch: ${graduation.batchName}`, "COMPLETED");
      } catch (err) {
        hasFailure = true;
        await this.logStep(run.id, `Graduate batch: ${graduation.batchName}`, "FAILED", errorMessage(err));
      }
    }

    for (const archival of run.plan.archivals) {
      try {
        await this.deps.updateBatchStatus({ actor, batchId: archival.batchId, status: "ARCHIVED" });
        await this.logStep(run.id, `Archive batch: ${archival.batchName}`, "COMPLETED");
      } catch (err) {
        hasFailure = true;
        await this.logStep(run.id, `Archive batch: ${archival.batchName}`, "FAILED", errorMessage(err));
      }
    }

    let newBatchId: string | null = null;
    try {
      const created = await this.deps.createBatch({ actor, name: run.plan.newIntake.name, year: run.plan.newIntake.year });
      newBatchId = created.id;
      await this.logStep(run.id, `Create new intake batch: ${run.plan.newIntake.name}`, "COMPLETED");
    } catch (err) {
      hasFailure = true;
      await this.logStep(run.id, `Create new intake batch: ${run.plan.newIntake.name}`, "FAILED", errorMessage(err));
    }

    if (newBatchId) {
      const batchId = newBatchId;
      for (const assignment of run.plan.coordinatorAssignments) {
        try {
          await this.deps.assignBatch({ actor, coordinatorId: assignment.coordinatorId, batchId });
          await this.logStep(run.id, `Assign coordinator: ${assignment.coordinatorName}`, "COMPLETED");
        } catch (err) {
          hasFailure = true;
          await this.logStep(run.id, `Assign coordinator: ${assignment.coordinatorName}`, "FAILED", errorMessage(err));
        }
      }
    } else if (run.plan.coordinatorAssignments.length > 0) {
      hasFailure = true;
      await this.logStep(run.id, "Assign coordinators", "FAILED", "Skipped — the new intake batch was not created");
    }

    await this.deps.runRepository.complete(run.id, hasFailure ? "FAILED" : "COMPLETED");

    const finished = await this.deps.runRepository.findById(run.id);
    await this.deps.auditRecorder.record({
      actorUserId: run.actorUserId,
      action: AUDIT_ACTIONS.ACADEMIC_YEAR_TRANSITION_COMPLETED,
      targetEntityType: "AcademicYearTransitionRun",
      targetEntityId: run.id,
      metadata: {
        status: finished?.status ?? (hasFailure ? "FAILED" : "COMPLETED"),
        stepCount: finished?.stepLog.length ?? 0,
        hasFailure,
      },
    });
  }

  private async logStep(runId: string, step: string, status: "COMPLETED" | "FAILED", detail?: string): Promise<void> {
    await this.deps.runRepository.appendStepLog(runId, { step, status, detail, occurredAt: new Date().toISOString() });
  }

  async onPermanentFailure(rawPayload: Record<string, unknown>, error: Error): Promise<void> {
    const payload = rawPayload as unknown as AcademicYearTransitionJobPayload;
    await this.deps.runRepository.markFailed(payload.runId, error.message);
  }
}
