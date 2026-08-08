import { beforeEach, describe, expect, it } from "vitest";
import { CreateCoordinatorUseCase } from "../../../src/modules/coordinators/application/use-cases/create-coordinator";
import { BatchNotFoundError, DuplicateEmailError } from "../../../src/modules/coordinators/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeCoordinatorUserProvisioner } from "../../support/fakes/fake-coordinator-user-provisioner";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };

function buildUseCase() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const coordinatorUserProvisioner = new FakeCoordinatorUserProvisioner();
  const batchLookup = new InMemoryBatchLookup();
  const auditRecorder = new FakeAuditRecorder();

  const useCase = new CreateCoordinatorUseCase({
    coordinatorRepository,
    coordinatorUserProvisioner,
    batchLookup,
    auditRecorder,
  });

  return { useCase, coordinatorRepository, coordinatorUserProvisioner, batchLookup, auditRecorder };
}

describe("CreateCoordinatorUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
    ctx.batchLookup.seed("batch-a", "ACTIVE");
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR, email: "new@tnparch.in", fullName: "New Coordinator" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("creates a coordinator and returns a plaintext temp password", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, email: "new@tnparch.in", fullName: "New Coordinator" });

    expect(result.coordinator.fullName).toBe("New Coordinator");
    expect(result.tempPassword).toBeTruthy();
    expect(result.tempPassword.length).toBeGreaterThan(8);
  });

  it("rejects an unknown batch id in the initial assignment list", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        email: "new@tnparch.in",
        fullName: "New Coordinator",
        batchIds: ["no-such-batch"],
      }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });

  it("assigns every provided batch id on creation", async () => {
    ctx.batchLookup.seed("batch-b", "ACTIVE");
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      email: "new@tnparch.in",
      fullName: "New Coordinator",
      batchIds: ["batch-a", "batch-b"],
    });

    expect(result.coordinator.batchIds).toEqual(["batch-a", "batch-b"]);
  });

  it("throws DuplicateEmailError when the email is already in use", async () => {
    ctx.coordinatorUserProvisioner.seedExistingEmail("taken@tnparch.in");
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, email: "taken@tnparch.in", fullName: "New Coordinator" }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("records a COORDINATOR_CREATED audit entry", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, email: "new@tnparch.in", fullName: "New Coordinator" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "COORDINATOR_CREATED" }),
    );
  });
});
