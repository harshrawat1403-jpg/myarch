import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { StartBulkImportUseCase } from "../../../src/modules/students/application/use-cases/start-bulk-import";
import type { BulkImportStudentsJobPayload } from "../../../src/modules/students/application/use-cases/start-bulk-import";
import { BatchNotAssignableError, BatchNotFoundError, EmptyCsvFileError } from "../../../src/modules/students/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { InMemoryBulkImportRunRepository } from "../../support/fakes/in-memory-bulk-import-run-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR_B: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-b"] };

const CSV_CONTENT = "email,fullName,rollNumber\nalice@x.com,Alice,BA001\nbob@x.com,Bob,BA002\n";

function buildUseCase() {
  const batchLookup = new InMemoryBatchLookup();
  batchLookup.seed("batch-a", "ACTIVE");
  batchLookup.seed("batch-archived", "ARCHIVED");
  const bulkImportRunRepository = new InMemoryBulkImportRunRepository();
  const auditRecorder = new FakeAuditRecorder();
  const savedFiles: { storageKey: string; data: Buffer }[] = [];
  const dispatchedJobs: BulkImportStudentsJobPayload[] = [];
  const useCase = new StartBulkImportUseCase({
    batchLookup,
    bulkImportRunRepository,
    auditRecorder,
    saveFile: async (storageKey, data) => {
      savedFiles.push({ storageKey, data });
    },
    dispatchJob: async (payload) => {
      dispatchedJobs.push(payload);
      return { jobId: "job-1" };
    },
  });
  return { useCase, batchLookup, bulkImportRunRepository, auditRecorder, savedFiles, dispatchedJobs };
}

describe("StartBulkImportUseCase", () => {
  let ctx: ReturnType<typeof buildUseCase>;

  beforeEach(() => {
    ctx = buildUseCase();
  });

  it("rejects a Coordinator out of scope for the target batch", async () => {
    await expect(
      ctx.useCase.execute({ actor: COORDINATOR_B, batchId: "batch-a", fileData: Buffer.from(CSV_CONTENT) }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws BatchNotFoundError for an unknown batch", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, batchId: "missing", fileData: Buffer.from(CSV_CONTENT) }),
    ).rejects.toBeInstanceOf(BatchNotFoundError);
  });

  it("throws BatchNotAssignableError for an archived batch", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, batchId: "batch-archived", fileData: Buffer.from(CSV_CONTENT) }),
    ).rejects.toBeInstanceOf(BatchNotAssignableError);
  });

  it("throws EmptyCsvFileError for a CSV with no data rows", async () => {
    await expect(
      ctx.useCase.execute({ actor: SECRETARY, batchId: "batch-a", fileData: Buffer.from("email,fullName,rollNumber\n") }),
    ).rejects.toBeInstanceOf(EmptyCsvFileError);
  });

  it("creates a run, saves the file, and dispatches a job with the actor's scope embedded", async () => {
    const result = await ctx.useCase.execute({ actor: SECRETARY, batchId: "batch-a", fileData: Buffer.from(CSV_CONTENT) });

    expect(result.totalRows).toBe(2);
    expect(ctx.savedFiles).toHaveLength(1);
    expect(ctx.dispatchedJobs).toHaveLength(1);
    expect(ctx.dispatchedJobs[0]!.batchId).toBe("batch-a");
    expect(ctx.dispatchedJobs[0]!.actor).toEqual({ userId: "sec-1", role: "SECRETARY" });

    const run = await ctx.bulkImportRunRepository.findById(result.bulkImportRunId);
    expect(run?.totalRows).toBe(2);
  });

  it("embeds a Coordinator's batchScope in the dispatched job payload", async () => {
    const coordinatorA: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-a"] };
    await ctx.useCase.execute({ actor: coordinatorA, batchId: "batch-a", fileData: Buffer.from(CSV_CONTENT) });
    expect(ctx.dispatchedJobs[0]!.actor).toEqual({ userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-a"] });
  });

  it("records a BULK_STUDENT_IMPORT_STARTED audit entry", async () => {
    await ctx.useCase.execute({ actor: SECRETARY, batchId: "batch-a", fileData: Buffer.from(CSV_CONTENT) });
    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({ action: "BULK_STUDENT_IMPORT_STARTED" }),
    );
  });
});
