import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { ComputeTransitionPlanUseCase } from "../../../src/modules/academic-year/application/use-cases/compute-transition-plan";
import {
  BatchNotEligibleForArchivalError,
  BatchNotEligibleForGraduationError,
  TransitionBatchNotFoundError,
  TransitionCoordinatorNotFoundError,
} from "../../../src/modules/academic-year/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryAcademicYearReferenceRepository } from "../../support/fakes/in-memory-academic-year-reference-repository";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function buildUseCase() {
  const referenceRepository = new InMemoryAcademicYearReferenceRepository();
  referenceRepository.seedBatch({ id: "active-batch", name: "B.Arch 2021", status: "ACTIVE" });
  referenceRepository.seedBatch({ id: "graduated-batch", name: "B.Arch 2016", status: "GRADUATED" });
  referenceRepository.seedCoordinator({ id: "coord-a", fullName: "Alice Coordinator" });
  const useCase = new ComputeTransitionPlanUseCase({ referenceRepository });
  return { useCase, referenceRepository };
}

const BASE_INPUT = {
  graduateBatchIds: [],
  archiveBatchIds: [],
  newIntake: { name: "B.Arch 2026", year: 2026 },
  coordinatorIds: [],
};

describe("ComputeTransitionPlanUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(ctx.useCase.execute({ actor: COORDINATOR, ...BASE_INPUT })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("builds a graduation action for an ACTIVE batch", async () => {
    const plan = await ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, graduateBatchIds: ["active-batch"] });
    expect(plan.graduations).toEqual([
      { batchId: "active-batch", batchName: "B.Arch 2021", fromStatus: "ACTIVE", toStatus: "GRADUATED" },
    ]);
  });

  it("throws BatchNotEligibleForGraduationError for a non-ACTIVE batch", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, graduateBatchIds: ["graduated-batch"] }),
    ).rejects.toBeInstanceOf(BatchNotEligibleForGraduationError);
  });

  it("builds an archival action for a GRADUATED batch", async () => {
    const plan = await ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, archiveBatchIds: ["graduated-batch"] });
    expect(plan.archivals).toEqual([
      { batchId: "graduated-batch", batchName: "B.Arch 2016", fromStatus: "GRADUATED", toStatus: "ARCHIVED" },
    ]);
  });

  it("throws BatchNotEligibleForArchivalError for a non-GRADUATED batch", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, archiveBatchIds: ["active-batch"] }),
    ).rejects.toBeInstanceOf(BatchNotEligibleForArchivalError);
  });

  it("throws TransitionBatchNotFoundError for an unknown batch id", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, graduateBatchIds: ["missing"] }),
    ).rejects.toBeInstanceOf(TransitionBatchNotFoundError);
  });

  it("resolves coordinator names for coordinatorIds", async () => {
    const plan = await ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, coordinatorIds: ["coord-a"] });
    expect(plan.coordinatorAssignments).toEqual([{ coordinatorId: "coord-a", coordinatorName: "Alice Coordinator" }]);
  });

  it("throws TransitionCoordinatorNotFoundError for an unknown coordinator id", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, ...BASE_INPUT, coordinatorIds: ["missing"] }),
    ).rejects.toBeInstanceOf(TransitionCoordinatorNotFoundError);
  });

  it("carries the new intake fields through unchanged (trimmed)", async () => {
    const plan = await ctx.useCase.execute({
      actor: SECRETARY,
      ...BASE_INPUT,
      newIntake: { name: "  B.Arch 2026  ", year: 2026 },
    });
    expect(plan.newIntake).toEqual({ name: "B.Arch 2026", year: 2026 });
  });
});
