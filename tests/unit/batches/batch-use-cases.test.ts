import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateBatchUseCase } from "../../../src/modules/batches/application/use-cases/create-batch";
import { UpdateBatchUseCase } from "../../../src/modules/batches/application/use-cases/update-batch";
import { UpdateBatchStatusUseCase } from "../../../src/modules/batches/application/use-cases/update-batch-status";
import { ListBatchesUseCase } from "../../../src/modules/batches/application/use-cases/list-batches";
import { GetBatchUseCase } from "../../../src/modules/batches/application/use-cases/get-batch";
import { BatchNotFoundError } from "../../../src/modules/batches/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryBatchRepository } from "../../support/fakes/in-memory-batch-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorB: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };

describe("CreateBatchUseCase", () => {
  let repo: InMemoryBatchRepository;
  let useCase: CreateBatchUseCase;

  beforeEach(() => {
    repo = new InMemoryBatchRepository();
    useCase = new CreateBatchUseCase({ batchRepository: repo });
  });

  it("allows the Secretary to create a batch", async () => {
    const batch = await useCase.execute({ actor: secretary, name: "B.Arch 2026", year: 2026 });
    expect(batch.name).toBe("B.Arch 2026");
    expect(batch.status).toBe("ACTIVE");
  });

  it("denies a Coordinator (Secretary-only per the permissions matrix)", async () => {
    await expect(
      useCase.execute({ actor: coordinatorA, name: "B.Arch 2026", year: 2026 }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, name: "X", year: 2026 })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
});

describe("UpdateBatchUseCase", () => {
  let repo: InMemoryBatchRepository;
  let useCase: UpdateBatchUseCase;
  let batchId: string;

  beforeEach(async () => {
    repo = new InMemoryBatchRepository();
    useCase = new UpdateBatchUseCase({ batchRepository: repo });
    const batch = await repo.create({ name: "Original", year: 2025 });
    batchId = batch.id;
  });

  it("allows the Secretary to rename a batch", async () => {
    const updated = await useCase.execute({ actor: secretary, batchId, name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("denies a Coordinator", async () => {
    await expect(
      useCase.execute({ actor: coordinatorA, batchId, name: "Renamed" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws BatchNotFoundError for an unknown batch", async () => {
    await expect(
      useCase.execute({ actor: secretary, batchId: "does-not-exist", name: "X" }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });
});

describe("UpdateBatchStatusUseCase", () => {
  it("allows the Secretary to archive a batch", async () => {
    const repo = new InMemoryBatchRepository();
    const useCase = new UpdateBatchStatusUseCase({ batchRepository: repo });
    const batch = await repo.create({ name: "Old Batch", year: 2020 });

    const updated = await useCase.execute({ actor: secretary, batchId: batch.id, status: "ARCHIVED" });
    expect(updated.status).toBe("ARCHIVED");
  });

  it("denies a Coordinator from changing lifecycle status", async () => {
    const repo = new InMemoryBatchRepository();
    const useCase = new UpdateBatchStatusUseCase({ batchRepository: repo });
    const batch = await repo.create({ name: "Old Batch", year: 2020 });

    await expect(
      useCase.execute({ actor: coordinatorA, batchId: batch.id, status: "ARCHIVED" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("ListBatchesUseCase", () => {
  let repo: InMemoryBatchRepository;
  let useCase: ListBatchesUseCase;

  beforeEach(async () => {
    repo = new InMemoryBatchRepository();
    useCase = new ListBatchesUseCase({ batchRepository: repo });
    const a = await repo.create({ name: "Batch A", year: 2025 });
    const b = await repo.create({ name: "Batch B", year: 2026 });
    // Re-seed with fixed IDs matching the coordinator fixtures above.
    repo.seed({ ...a, id: "batch-a" });
    repo.seed({ ...b, id: "batch-b" });
  });

  it("returns every batch for the Secretary", async () => {
    const batches = await useCase.execute({ actor: secretary });
    expect(batches.length).toBeGreaterThanOrEqual(2);
  });

  it("restricts a Coordinator to only their assigned batch(es)", async () => {
    const batches = await useCase.execute({ actor: coordinatorA });
    expect(batches.map((b) => b.id)).toEqual(["batch-a"]);
  });

  it("returns an empty list for a Coordinator with no batch scope", async () => {
    const unscoped: AuthenticatedActor = { userId: "coord-3", role: "COORDINATOR", batchScope: [] };
    const batches = await useCase.execute({ actor: unscoped });
    expect(batches).toEqual([]);
  });
});

describe("GetBatchUseCase", () => {
  let repo: InMemoryBatchRepository;
  let useCase: GetBatchUseCase;

  beforeEach(() => {
    repo = new InMemoryBatchRepository();
    useCase = new GetBatchUseCase({ batchRepository: repo });
  });

  it("allows the Secretary to fetch any batch", async () => {
    const batch = await repo.create({ name: "Any Batch", year: 2025 });
    const result = await useCase.execute({ actor: secretary, batchId: batch.id });
    expect(result.id).toBe(batch.id);
  });

  it("allows an in-scope Coordinator", async () => {
    const batch = await repo.create({ name: "Scoped Batch", year: 2025 });
    repo.seed({ ...batch, id: "batch-a" });
    const result = await useCase.execute({ actor: coordinatorA, batchId: "batch-a" });
    expect(result.id).toBe("batch-a");
  });

  it("denies an out-of-scope Coordinator (brief's named boundary)", async () => {
    const batch = await repo.create({ name: "Scoped Batch", year: 2025 });
    repo.seed({ ...batch, id: "batch-a" });
    await expect(
      useCase.execute({ actor: coordinatorB, batchId: "batch-a" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws BatchNotFoundError for an unknown batch", async () => {
    await expect(
      useCase.execute({ actor: secretary, batchId: "does-not-exist" }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });
});
