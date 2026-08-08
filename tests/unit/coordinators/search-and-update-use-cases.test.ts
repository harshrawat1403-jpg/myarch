import { beforeEach, describe, expect, it } from "vitest";
import { SearchCoordinatorsUseCase } from "../../../src/modules/coordinators/application/use-cases/search-coordinators";
import { UpdateCoordinatorUseCase } from "../../../src/modules/coordinators/application/use-cases/update-coordinator";
import { GetCoordinatorUseCase } from "../../../src/modules/coordinators/application/use-cases/get-coordinator";
import { CoordinatorNotFoundError } from "../../../src/modules/coordinators/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCoordinatorRepository } from "../../support/fakes/in-memory-coordinator-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { CoordinatorRecord } from "../../../src/modules/coordinators";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(overrides: Partial<CoordinatorRecord> = {}): CoordinatorRecord {
  return {
    id: overrides.id ?? "coord-record-1",
    userId: overrides.userId ?? "user-1",
    email: overrides.email ?? "alice@tnparch.in",
    fullName: overrides.fullName ?? "Alice Coordinator",
    isActive: overrides.isActive ?? true,
    batchIds: overrides.batchIds ?? [],
    createdAt: overrides.createdAt ?? new Date(),
  };
}

describe("SearchCoordinatorsUseCase", () => {
  it("rejects a non-Secretary actor", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    const useCase = new SearchCoordinatorsUseCase({ coordinatorRepository });
    await expect(useCase.execute({ actor: COORDINATOR, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("excludes inactive coordinators by default, includes them when includeInactive is set", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    coordinatorRepository.seed(record({ id: "active-1", isActive: true }));
    coordinatorRepository.seed(record({ id: "inactive-1", isActive: false }));
    const useCase = new SearchCoordinatorsUseCase({ coordinatorRepository });

    const defaultResults = await useCase.execute({ actor: SECRETARY, filters: {} });
    expect(defaultResults).toHaveLength(1);

    const allResults = await useCase.execute({ actor: SECRETARY, filters: { includeInactive: true } });
    expect(allResults).toHaveLength(2);
  });
});

describe("GetCoordinatorUseCase", () => {
  it("throws CoordinatorNotFoundError for an unknown id", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    const useCase = new GetCoordinatorUseCase({ coordinatorRepository });
    await expect(useCase.execute({ actor: SECRETARY, coordinatorId: "missing" })).rejects.toBeInstanceOf(
      CoordinatorNotFoundError,
    );
  });

  it("returns the coordinator when found", async () => {
    const coordinatorRepository = new InMemoryCoordinatorRepository();
    coordinatorRepository.seed(record({ id: "coord-record-1" }));
    const useCase = new GetCoordinatorUseCase({ coordinatorRepository });
    const result = await useCase.execute({ actor: SECRETARY, coordinatorId: "coord-record-1" });
    expect(result.id).toBe("coord-record-1");
  });
});

describe("UpdateCoordinatorUseCase", () => {
  let coordinatorRepository: InMemoryCoordinatorRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: UpdateCoordinatorUseCase;

  beforeEach(() => {
    coordinatorRepository = new InMemoryCoordinatorRepository();
    coordinatorRepository.seed(record({ id: "coord-record-1" }));
    auditRecorder = new FakeAuditRecorder();
    useCase = new UpdateCoordinatorUseCase({ coordinatorRepository, auditRecorder });
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      useCase.execute({ actor: COORDINATOR, coordinatorId: "coord-record-1", fullName: "New Name" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("updates the full name", async () => {
    const result = await useCase.execute({ actor: SECRETARY, coordinatorId: "coord-record-1", fullName: "New Name" });
    expect(result.fullName).toBe("New Name");
  });

  it("records a COORDINATOR_UPDATED audit entry", async () => {
    await useCase.execute({ actor: SECRETARY, coordinatorId: "coord-record-1", fullName: "New Name" });
    expect(auditRecorder.entries).toContainEqual(expect.objectContaining({ action: "COORDINATOR_UPDATED" }));
  });
});
