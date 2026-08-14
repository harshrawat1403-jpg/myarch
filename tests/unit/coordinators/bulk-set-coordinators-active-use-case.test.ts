import { beforeEach, describe, expect, it } from "vitest";
import { SetCoordinatorActiveUseCase } from "../../../src/modules/coordinators/application/use-cases/set-coordinator-active";
import { BulkSetCoordinatorsActiveUseCase } from "../../../src/modules/coordinators/application/use-cases/bulk-set-coordinators-active";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

function record(id: string): CoordinatorRecord {
  return {
    id,
    userId: `user-${id}`,
    email: `${id}@tnparch.in`,
    fullName: `Coordinator ${id}`,
    isActive: true,
    position: null,
    batchIds: [],
    permissions: [],
    createdAt: new Date(),
  };
}

describe("BulkSetCoordinatorsActiveUseCase", () => {
  let coordinatorRepository: InMemoryCoordinatorRepository;
  let auditRecorder: FakeAuditRecorder;
  let bulkUseCase: BulkSetCoordinatorsActiveUseCase;

  beforeEach(() => {
    coordinatorRepository = new InMemoryCoordinatorRepository();
    coordinatorRepository.seed(record("c1"));
    coordinatorRepository.seed(record("c2"));
    coordinatorRepository.seed(record("c3"));
    auditRecorder = new FakeAuditRecorder();
    const setCoordinatorActiveUseCase = new SetCoordinatorActiveUseCase({
      coordinatorRepository,
      auditRecorder,
      revokeUserSessions: async () => {},
    });
    bulkUseCase = new BulkSetCoordinatorsActiveUseCase({ setCoordinatorActiveUseCase, auditRecorder });
  });

  it("disables every coordinator id given and reports them as succeeded", async () => {
    const result = await bulkUseCase.execute({ actor: SECRETARY, coordinatorIds: ["c1", "c2", "c3"], isActive: false });

    expect(result.succeeded).toEqual(["c1", "c2", "c3"]);
    expect(result.failed).toHaveLength(0);
    expect((await coordinatorRepository.findById("c1"))!.isActive).toBe(false);
  });

  it("collects a per-id failure without aborting the rest of the batch", async () => {
    const result = await bulkUseCase.execute({
      actor: SECRETARY,
      coordinatorIds: ["c1", "does-not-exist", "c3"],
      isActive: false,
    });

    expect(result.succeeded).toEqual(["c1", "c3"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.id).toBe("does-not-exist");
  });

  it("records a single BULK_OPERATION audit entry summarizing the batch", async () => {
    await bulkUseCase.execute({ actor: SECRETARY, coordinatorIds: ["c1", "c2"], isActive: false });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        action: "BULK_OPERATION",
        metadata: expect.objectContaining({ entityType: "coordinator", operation: "disable", count: 2 }),
      }),
    );
  });
});
