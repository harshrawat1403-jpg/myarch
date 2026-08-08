import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetAcademicYearTransitionRunUseCase } from "../../../src/modules/academic-year/application/use-cases/get-academic-year-transition-run";
import { AcademicYearTransitionRunNotFoundError } from "../../../src/modules/academic-year/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryAcademicYearTransitionRunRepository } from "../../support/fakes/in-memory-academic-year-transition-run-repository";
import type { AcademicYearTransitionRunRecord } from "../../../src/modules/academic-year";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(): AcademicYearTransitionRunRecord {
  return {
    id: "run-1",
    actorUserId: "sec-1",
    status: "RUNNING",
    plan: { graduations: [], archivals: [], newIntake: { name: "X", year: 2026 }, coordinatorAssignments: [] },
    stepLog: [],
    currentStep: null,
    createdAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
    errorMessage: null,
  };
}

describe("GetAcademicYearTransitionRunUseCase", () => {
  it("throws AcademicYearTransitionRunNotFoundError for an unknown id", async () => {
    const runRepository = new InMemoryAcademicYearTransitionRunRepository();
    const useCase = new GetAcademicYearTransitionRunUseCase({ runRepository });
    await expect(useCase.execute({ actor: SECRETARY, runId: "missing" })).rejects.toBeInstanceOf(
      AcademicYearTransitionRunNotFoundError,
    );
  });

  it("rejects a non-Secretary actor", async () => {
    const runRepository = new InMemoryAcademicYearTransitionRunRepository();
    runRepository.seed(record());
    const useCase = new GetAcademicYearTransitionRunUseCase({ runRepository });
    await expect(useCase.execute({ actor: COORDINATOR, runId: "run-1" })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("returns the run for a Secretary", async () => {
    const runRepository = new InMemoryAcademicYearTransitionRunRepository();
    runRepository.seed(record());
    const useCase = new GetAcademicYearTransitionRunUseCase({ runRepository });
    const result = await useCase.execute({ actor: SECRETARY, runId: "run-1" });
    expect(result.id).toBe("run-1");
  });
});
