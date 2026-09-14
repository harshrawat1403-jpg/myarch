import { beforeEach, describe, expect, it } from "vitest";
import {
  CreateCoordinatorUseCase,
  type CreateCoordinatorTransactionContext,
} from "../../../src/modules/coordinators/application/use-cases/create-coordinator";
import { SetCoordinatorMaintenanceRoleUseCase } from "../../../src/modules/coordinators/application/use-cases/set-coordinator-maintenance-role";
import {
  BatchNotFoundError,
  DuplicateEmailError,
  InvalidCustomPositionError,
  MaxActiveCoordinatorsError,
  MaxActiveMaintenanceRoleError,
} from "../../../src/modules/coordinators/domain/errors";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeCoordinatorUserProvisioner } from "../../support/fakes/fake-coordinator-user-provisioner";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };

/**
 * Simulates Prisma's real `$transaction(async (tx) => ...)` rollback
 * semantics (see container.ts's real `runCreateCoordinatorTransaction` for
 * the production wiring this stands in for): snapshots every fake's state
 * before invoking the callback, and restores it if the callback throws —
 * so "no orphan User/CoordinatorProfile is left behind on failure" is a
 * real, checkable assertion against these fakes, not just a hope.
 */
function buildFakeTransactionRunner(
  coordinatorRepository: InMemoryCoordinatorRepository,
  coordinatorUserProvisioner: FakeCoordinatorUserProvisioner,
  auditRecorder: FakeAuditRecorder,
) {
  const setMaintenanceRoleUseCase = new SetCoordinatorMaintenanceRoleUseCase({ coordinatorRepository, auditRecorder });

  return async function runCreateCoordinatorTransaction<T>(
    fn: (ctx: CreateCoordinatorTransactionContext) => Promise<T>,
  ): Promise<T> {
    const coordinatorSnapshot = coordinatorRepository.snapshot();
    const provisionedEmailsSnapshot = [...coordinatorUserProvisioner.provisionedEmails];
    const auditSnapshot = [...auditRecorder.entries];
    try {
      return await fn({
        coordinatorUserProvisioner,
        coordinatorRepository,
        auditRecorder,
        assignMaintenanceRole: (input) => setMaintenanceRoleUseCase.execute(input),
      });
    } catch (err) {
      coordinatorRepository.restore(coordinatorSnapshot);
      coordinatorUserProvisioner.provisionedEmails.length = 0;
      coordinatorUserProvisioner.provisionedEmails.push(...provisionedEmailsSnapshot);
      auditRecorder.entries.length = 0;
      auditRecorder.entries.push(...auditSnapshot);
      throw err;
    }
  };
}

function buildUseCase() {
  const coordinatorRepository = new InMemoryCoordinatorRepository();
  const coordinatorUserProvisioner = new FakeCoordinatorUserProvisioner();
  const batchLookup = new InMemoryBatchLookup();
  const auditRecorder = new FakeAuditRecorder();

  const useCase = new CreateCoordinatorUseCase({
    coordinatorRepository,
    batchLookup,
    runCreateCoordinatorTransaction: buildFakeTransactionRunner(coordinatorRepository, coordinatorUserProvisioner, auditRecorder),
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
      ctx.useCase.execute({ actor: COORDINATOR, email: "new@myarch.in", fullName: "New Coordinator" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("creates a coordinator and returns a plaintext temp password", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, email: "new@myarch.in", fullName: "New Coordinator" });

    expect(result.coordinator.fullName).toBe("New Coordinator");
    expect(result.tempPassword).toBeTruthy();
    expect(result.tempPassword.length).toBeGreaterThan(8);
  });

  it("rejects an unknown batch id in the initial assignment list", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        email: "new@myarch.in",
        fullName: "New Coordinator",
        batchIds: ["no-such-batch"],
      }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });

  it("assigns every provided batch id on creation", async () => {
    ctx.batchLookup.seed("batch-b", "ACTIVE");
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      email: "new@myarch.in",
      fullName: "New Coordinator",
      batchIds: ["batch-a", "batch-b"],
    });

    expect(result.coordinator.batchIds).toEqual(["batch-a", "batch-b"]);
  });

  it("throws DuplicateEmailError when the email is already in use, and leaves no orphan behind", async () => {
    ctx.coordinatorUserProvisioner.seedExistingEmail("taken@myarch.in");
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, email: "taken@myarch.in", fullName: "New Coordinator" }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);

    expect(ctx.coordinatorRepository.snapshot()).toHaveLength(0);
    expect(ctx.auditRecorder.entries).toHaveLength(0);
  });

  it("records a COORDINATOR_CREATED audit entry", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, email: "new@myarch.in", fullName: "New Coordinator" });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "COORDINATOR_CREATED" }),
    );
  });

  it("creates an Other Coordinator with a custom position label", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      email: "cultural@myarch.in",
      fullName: "Cultural Lead",
      position: "OTHER",
      customPosition: "Cultural Coordinator",
    });
    expect(result.coordinator.position).toBe("OTHER");
    expect(result.coordinator.customPosition).toBe("Cultural Coordinator");
  });

  it("rejects position OTHER with no customPosition text", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, email: "new@myarch.in", fullName: "New Coordinator", position: "OTHER" }),
    ).rejects.toBeInstanceOf(InvalidCustomPositionError);
  });

  it("rejects position OTHER with a blank/whitespace-only customPosition", async () => {
    await expect(
      ctx.useCase.execute({
        actor: SECRETARY,
        email: "new@myarch.in",
        fullName: "New Coordinator",
        position: "OTHER",
        customPosition: "   ",
      }),
    ).rejects.toBeInstanceOf(InvalidCustomPositionError);
  });

  it("ignores/clears customPosition when position is not OTHER", async () => {
    const result = await ctx.useCase.execute({
      actor: SECRETARY,
      email: "tech@myarch.in",
      fullName: "Tech Coordinator",
      position: "TECHNICAL",
      customPosition: "should be discarded",
    });
    expect(result.coordinator.position).toBe("TECHNICAL");
    expect(result.coordinator.customPosition).toBeNull();
  });

  it("rejects creating a third active coordinator (roadmap §2.1 — max 2 active)", async () => {
    const existing = (id: string): CoordinatorRecord => ({
      id,
      userId: `${id}-user`,
      email: `${id}@myarch.in`,
      fullName: id,
      isActive: true,
      position: null,
      customPosition: null,
      batchIds: [],
      permissions: [],
      maintenanceRole: null,
      createdAt: new Date(),
    });
    ctx.coordinatorRepository.seed(existing("coord-1"));
    ctx.coordinatorRepository.seed(existing("coord-2"));

    await expect(
      ctx.useCase.execute({ actor: SECRETARY, email: "third@myarch.in", fullName: "Third Coordinator" }),
    ).rejects.toBeInstanceOf(MaxActiveCoordinatorsError);

    // The pre-transaction check means nothing was ever provisioned, and the
    // existing Coordinator count is left exactly as it was — no orphan User
    // or CoordinatorProfile from the rejected attempt.
    expect(ctx.coordinatorUserProvisioner.provisionedEmails).toHaveLength(0);
    expect(ctx.coordinatorRepository.snapshot()).toHaveLength(2);
  });

  it("still allows creating a coordinator when only inactive coordinators exist", async () => {
    ctx.coordinatorRepository.seed({
      id: "coord-disabled",
      userId: "coord-disabled-user",
      email: "disabled@myarch.in",
      fullName: "Disabled Coordinator",
      isActive: false,
      position: null,
      customPosition: null,
      batchIds: [],
      permissions: [],
      maintenanceRole: null,
      createdAt: new Date(),
    });

    const result = await ctx.useCase.execute({ actor: SECRETARY, email: "new@myarch.in", fullName: "New Coordinator" });
    expect(result.coordinator.fullName).toBe("New Coordinator");
  });

  describe("atomic Maintenance functional-role designation", () => {
    it("creates a Maintenance Secretary in one atomic call", async () => {
      const result = await ctx.useCase.execute({
        actor: SECRETARY,
        email: "mtsec@myarch.in",
        fullName: "Maintenance Sec",
        position: "TECHNICAL",
        maintenanceRole: "MAINTENANCE_SECRETARY",
      });
      expect(result.coordinator.maintenanceRole).toBe("MAINTENANCE_SECRETARY");

      const persisted = await ctx.coordinatorRepository.findById(result.coordinator.id);
      expect(persisted?.maintenanceRole).toBe("MAINTENANCE_SECRETARY");
      expect(ctx.auditRecorder.entries.map((e) => e.action)).toEqual(
        expect.arrayContaining(["COORDINATOR_CREATED", "COORDINATOR_MAINTENANCE_ROLE_SET"]),
      );
    });

    it("creates a Maintenance Coordinator in one atomic call", async () => {
      const result = await ctx.useCase.execute({
        actor: SECRETARY,
        email: "mtcoord@myarch.in",
        fullName: "Maintenance Coord",
        position: "TECHNICAL",
        maintenanceRole: "MAINTENANCE_COORDINATOR",
      });
      expect(result.coordinator.maintenanceRole).toBe("MAINTENANCE_COORDINATOR");
    });

    it("rolls back the entire creation — no orphan User or CoordinatorProfile — when the Maintenance role cap is already full", async () => {
      // Seed an existing active Maintenance Secretary so the cap (max 1) is already hit.
      ctx.coordinatorRepository.seed({
        id: "existing-mtsec",
        userId: "existing-mtsec-user",
        email: "existing-mtsec@myarch.in",
        fullName: "Existing MtSec",
        isActive: true,
        position: "TECHNICAL",
        customPosition: null,
        batchIds: [],
        permissions: [],
        maintenanceRole: "MAINTENANCE_SECRETARY",
        createdAt: new Date(),
      });

      await expect(
        ctx.useCase.execute({
          actor: SECRETARY,
          email: "second-mtsec@myarch.in",
          fullName: "Second MtSec",
          position: "TECHNICAL",
          maintenanceRole: "MAINTENANCE_SECRETARY",
        }),
      ).rejects.toBeInstanceOf(MaxActiveMaintenanceRoleError);

      // The seeded record is the only one that should exist — the failed
      // attempt's User provisioning AND CoordinatorProfile creation must
      // both have been rolled back, not just the maintenanceRole field.
      expect(ctx.coordinatorRepository.snapshot()).toHaveLength(1);
      expect(ctx.coordinatorRepository.snapshot()[0]!.id).toBe("existing-mtsec");
      expect(ctx.coordinatorUserProvisioner.provisionedEmails).not.toContain("second-mtsec@myarch.in");
      expect(ctx.auditRecorder.entries.filter((e) => e.action === "COORDINATOR_CREATED")).toHaveLength(0);
    });

    it("rolls back when the Maintenance Coordinator cap is already full", async () => {
      ctx.coordinatorRepository.seed({
        id: "existing-mtcoord",
        userId: "existing-mtcoord-user",
        email: "existing-mtcoord@myarch.in",
        fullName: "Existing MtCoord",
        isActive: true,
        position: "TECHNICAL",
        customPosition: null,
        batchIds: [],
        permissions: [],
        maintenanceRole: "MAINTENANCE_COORDINATOR",
        createdAt: new Date(),
      });

      await expect(
        ctx.useCase.execute({
          actor: SECRETARY,
          email: "second-mtcoord@myarch.in",
          fullName: "Second MtCoord",
          position: "TECHNICAL",
          maintenanceRole: "MAINTENANCE_COORDINATOR",
        }),
      ).rejects.toBeInstanceOf(MaxActiveMaintenanceRoleError);

      expect(ctx.coordinatorRepository.snapshot()).toHaveLength(1);
      expect(ctx.coordinatorUserProvisioner.provisionedEmails).not.toContain("second-mtcoord@myarch.in");
    });
  });
});
