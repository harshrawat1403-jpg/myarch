import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetBulkImportRunUseCase } from "../../../src/modules/students/application/use-cases/get-bulk-import-run";
import { BulkImportRunNotFoundError } from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryBulkImportRunRepository } from "../../support/fakes/in-memory-bulk-import-run-repository";
import type { BulkImportRunRecord } from "../../../src/modules/students";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR_A: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const COORDINATOR_B: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-b"] };

function record(overrides: Partial<BulkImportRunRecord> = {}): BulkImportRunRecord {
  return {
    id: "run-1",
    actorUserId: "sec-1",
    batchId: "batch-a",
    status: "RUNNING",
    totalRows: 5,
    processedRows: 2,
    successCount: 2,
    failureCount: 0,
    errorReport: [],
    createdAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

describe("GetBulkImportRunUseCase", () => {
  it("throws BulkImportRunNotFoundError for an unknown id", async () => {
    const bulkImportRunRepository = new InMemoryBulkImportRunRepository();
    const useCase = new GetBulkImportRunUseCase({ bulkImportRunRepository });
    await expect(useCase.execute({ actor: SECRETARY, bulkImportRunId: "missing" })).rejects.toBeInstanceOf(
      BulkImportRunNotFoundError,
    );
  });

  it("allows the Secretary to view any run", async () => {
    const bulkImportRunRepository = new InMemoryBulkImportRunRepository();
    bulkImportRunRepository.seed(record());
    const useCase = new GetBulkImportRunUseCase({ bulkImportRunRepository });
    const result = await useCase.execute({ actor: SECRETARY, bulkImportRunId: "run-1" });
    expect(result.id).toBe("run-1");
  });

  it("allows an in-scope Coordinator, denies an out-of-scope one", async () => {
    const bulkImportRunRepository = new InMemoryBulkImportRunRepository();
    bulkImportRunRepository.seed(record());
    const useCase = new GetBulkImportRunUseCase({ bulkImportRunRepository });

    const result = await useCase.execute({ actor: COORDINATOR_A, bulkImportRunId: "run-1" });
    expect(result.id).toBe("run-1");

    await expect(useCase.execute({ actor: COORDINATOR_B, bulkImportRunId: "run-1" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
});
