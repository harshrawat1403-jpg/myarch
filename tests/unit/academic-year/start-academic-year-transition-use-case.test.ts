import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { StartAcademicYearTransitionUseCase } from "../../../src/modules/academic-year/application/use-cases/start-academic-year-transition";
import type { AcademicYearTransitionJobPayload } from "../../../src/modules/academic-year/application/use-cases/start-academic-year-transition";
import { InvalidConfirmationTextError } from "../../../src/modules/academic-year/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryAcademicYearTransitionRunRepository } from "../../support/fakes/in-memory-academic-year-transition-run-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { TransitionPlan } from "../../../src/modules/academic-year";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

const PLAN: TransitionPlan = {
  graduations: [],
  archivals: [],
  newIntake: { name: "B.Arch 2026", year: 2026 },
  coordinatorAssignments: [],
};

function buildUseCase() {
  const runRepository = new InMemoryAcademicYearTransitionRunRepository();
  const auditRecorder = new FakeAuditRecorder();
  const dispatchedJobs: AcademicYearTransitionJobPayload[] = [];
  const useCase = new StartAcademicYearTransitionUseCase({
    runRepository,
    auditRecorder,
    dispatchJob: async (payload) => {
      dispatchedJobs.push(payload);
      return { jobId: "job-1" };
    },
  });
  return { useCase, runRepository, auditRecorder, dispatchedJobs };
}

describe("StartAcademicYearTransitionUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, plan: PLAN, confirmationText: "CONFIRM" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects a confirmation text that isn't exactly CONFIRM", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, plan: PLAN, confirmationText: "confirm" }),
    ).rejects.toBeInstanceOf(InvalidConfirmationTextError);
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, plan: PLAN, confirmationText: "" }),
    ).rejects.toBeInstanceOf(InvalidConfirmationTextError);
  });

  it("creates a run, dispatches the job, and records an audit entry", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, plan: PLAN, confirmationText: "CONFIRM" });

    expect(ctx.dispatchedJobs).toEqual([{ runId: result.runId }]);
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "ACADEMIC_YEAR_TRANSITION_STARTED", targetEntityId: result.runId }),
    );

    const run = await ctx.runRepository.findById(result.runId);
    expect(run?.plan).toEqual(PLAN);
  });
});
