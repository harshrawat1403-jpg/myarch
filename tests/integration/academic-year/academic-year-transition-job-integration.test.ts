/**
 * End-to-end exercise of the real wiring (no fakes standing in for
 * StartAcademicYearTransitionUseCase, JobRegistry, or JobWorker themselves
 * — only leaf infrastructure ports are faked):
 *
 *   ComputeTransitionPlanUseCase.execute() -> validated TransitionPlan
 *   StartAcademicYearTransitionUseCase.execute() -> AcademicYearTransitionRun
 *     (DRAFT) + ACADEMIC_YEAR_TRANSITION job enqueued
 *   JobWorker.pollOnce() claims it
 *   AcademicYearTransitionJobHandler.handle() executes each step
 *   AcademicYearTransitionRun marked COMPLETED / FAILED
 */
import { describe, expect, it } from "vitest";
import { JobRegistry, JobWorker } from "../../../src/modules/jobs";
import { DefaultJobDispatcher } from "../../../src/modules/jobs/application/default-job-dispatcher";
import { ComputeTransitionPlanUseCase } from "../../../src/modules/academic-year/application/use-cases/compute-transition-plan";
import { StartAcademicYearTransitionUseCase } from "../../../src/modules/academic-year/application/use-cases/start-academic-year-transition";
import { ACADEMIC_YEAR_TRANSITION_JOB_TYPE } from "../../../src/modules/academic-year/application/use-cases/start-academic-year-transition";
import { AcademicYearTransitionJobHandler } from "../../../src/modules/academic-year/infrastructure/academic-year-transition-job-handler";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";
import { InMemoryAcademicYearReferenceRepository } from "../../support/fakes/in-memory-academic-year-reference-repository";
import { InMemoryAcademicYearTransitionRunRepository } from "../../support/fakes/in-memory-academic-year-transition-run-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeJobLogger } from "../../support/fakes/fake-job-logger";
import { FakeJobMetricsRecorder } from "../../support/fakes/fake-job-metrics-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function buildWorld() {
  const jobRepository = new InMemoryJobRepository();
  const jobRegistry = new JobRegistry();
  const jobDispatcher = new DefaultJobDispatcher({ jobRepository });

  const referenceRepository = new InMemoryAcademicYearReferenceRepository();
  referenceRepository.seedBatch({ id: "b1", name: "B.Arch 2021", status: "ACTIVE" });
  referenceRepository.seedBatch({ id: "b0", name: "B.Arch 2016", status: "GRADUATED" });
  referenceRepository.seedCoordinator({ id: "coord-a", fullName: "Alice Coordinator" });

  const runRepository = new InMemoryAcademicYearTransitionRunRepository();
  const auditRecorder = new FakeAuditRecorder();

  const computeTransitionPlanUseCase = new ComputeTransitionPlanUseCase({ referenceRepository });
  const startAcademicYearTransitionUseCase = new StartAcademicYearTransitionUseCase({
    runRepository,
    auditRecorder,
    dispatchJob: (payload) => jobDispatcher.dispatch(ACADEMIC_YEAR_TRANSITION_JOB_TYPE, payload as unknown as Record<string, unknown>, { maxAttempts: 1 }),
  });

  const graduatedBatchIds: string[] = [];
  const archivedBatchIds: string[] = [];
  const createdBatchNames: string[] = [];
  const assignedCoordinatorIds: string[] = [];

  jobRegistry.register(
    new AcademicYearTransitionJobHandler({
      runRepository,
      auditRecorder,
      createBatch: async (input) => {
        createdBatchNames.push(input.name);
        return { id: "new-batch-1", name: input.name, year: input.year, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
      },
      updateBatchStatus: async (input) => {
        if (input.status === "GRADUATED") graduatedBatchIds.push(input.batchId);
        if (input.status === "ARCHIVED") archivedBatchIds.push(input.batchId);
        return { id: input.batchId, name: "x", year: 2020, status: input.status, createdAt: new Date(), updatedAt: new Date() };
      },
      assignBatch: async (input) => {
        assignedCoordinatorIds.push(input.coordinatorId);
        return { id: input.coordinatorId, userId: "u", email: "x@x.com", fullName: "x", isActive: true, batchIds: [input.batchId], createdAt: new Date() };
      },
    }),
  );

  const worker = new JobWorker(
    { jobRepository, jobRegistry, logger: new FakeJobLogger(), metrics: new FakeJobMetricsRecorder() },
    { batchSize: 5 },
  );

  return {
    computeTransitionPlanUseCase,
    startAcademicYearTransitionUseCase,
    worker,
    jobRepository,
    runRepository,
    graduatedBatchIds,
    archivedBatchIds,
    createdBatchNames,
    assignedCoordinatorIds,
  };
}

describe("Academic Year Transition -> Job -> Worker -> batches/coordinators use cases — end to end", () => {
  it("computes a plan, confirms it, and executes every step through the full job pipeline", async () => {
    const world = buildWorld();

    const plan = await world.computeTransitionPlanUseCase.execute({
      actor: SECRETARY,
      graduateBatchIds: ["b1"],
      archiveBatchIds: ["b0"],
      newIntake: { name: "B.Arch 2026", year: 2026 },
      coordinatorIds: ["coord-a"],
    });

    const { runId } = await world.startAcademicYearTransitionUseCase.execute({
      actor: SECRETARY,
      plan,
      confirmationText: "CONFIRM",
    });

    // execute() only enqueues — nothing has run yet.
    expect((await world.runRepository.findById(runId))!.status).toBe("DRAFT");
    expect(world.jobRepository.jobs[0]!.type).toBe(ACADEMIC_YEAR_TRANSITION_JOB_TYPE);

    const claimed = await world.worker.pollOnce();

    expect(claimed).toBe(1);
    expect(world.graduatedBatchIds).toEqual(["b1"]);
    expect(world.archivedBatchIds).toEqual(["b0"]);
    expect(world.createdBatchNames).toEqual(["B.Arch 2026"]);
    expect(world.assignedCoordinatorIds).toEqual(["coord-a"]);

    const finalRun = await world.runRepository.findById(runId);
    expect(finalRun!.status).toBe("COMPLETED");
    expect(finalRun!.stepLog).toHaveLength(4);
    expect(world.jobRepository.jobs[0]!.status).toBe("COMPLETED");
  });
});
