import { beforeEach, describe, expect, it } from "vitest";
import { CreateStudentUseCase } from "../../../src/modules/students/application/use-cases/create-student";
import { BulkImportStudentsJobHandler } from "../../../src/modules/students/infrastructure/bulk-import-job-handler";
import type { BulkImportStudentsJobPayload } from "../../../src/modules/students/application/use-cases/start-bulk-import";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { FakeUserProvisioner } from "../../support/fakes/fake-user-provisioner";
import { InMemoryBulkImportRunRepository } from "../../support/fakes/in-memory-bulk-import-run-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const CSV_HEADER = "email,fullName,rollNumber,cgpa\n";

function buildHandler() {
  const studentRepository = new InMemoryStudentRepository();
  const batchLookup = new InMemoryBatchLookup();
  batchLookup.seed("11111111-1111-1111-1111-111111111111", "ACTIVE");
  const userProvisioner = new FakeUserProvisioner();
  const createStudentUseCase = new CreateStudentUseCase({ studentRepository, batchLookup, userProvisioner });
  const bulkImportRunRepository = new InMemoryBulkImportRunRepository();
  const auditRecorder = new FakeAuditRecorder();

  const files = new Map<string, Buffer>();
  const deletedKeys: string[] = [];
  const handler = new BulkImportStudentsJobHandler({
    bulkImportRunRepository,
    createStudentUseCase,
    auditRecorder,
    readFile: async (storageKey) => {
      const data = files.get(storageKey);
      if (!data) throw new Error(`No such file: ${storageKey}`);
      return data;
    },
    deleteFile: async (storageKey) => {
      deletedKeys.push(storageKey);
    },
  });

  return { handler, studentRepository, bulkImportRunRepository, auditRecorder, files, deletedKeys, userProvisioner };
}

function payload(overrides: Partial<BulkImportStudentsJobPayload> = {}): BulkImportStudentsJobPayload {
  return {
    bulkImportRunId: "run-1",
    storageKey: "bulk-imports/run-1.csv",
    batchId: "11111111-1111-1111-1111-111111111111",
    actor: { userId: "sec-1", role: "SECRETARY" },
    ...overrides,
  };
}

describe("BulkImportStudentsJobHandler", () => {
  let ctx: ReturnType<typeof buildHandler>;

  beforeEach(() => {
    ctx = buildHandler();
  });

  it("creates every valid row and marks the run COMPLETED", async () => {
    const run = await ctx.bulkImportRunRepository.create({ actorUserId: "sec-1", batchId: "11111111-1111-1111-1111-111111111111", totalRows: 2 });
    ctx.files.set(
      "bulk-imports/valid.csv",
      Buffer.from(`${CSV_HEADER}alice@x.com,Alice,BA001,8.5\nbob@x.com,Bob,BA002,7.2\n`),
    );

    await ctx.handler.handle(
      payload({ bulkImportRunId: run.id, storageKey: "bulk-imports/valid.csv" }) as unknown as Record<string, unknown>,
    );

    const finalRun = await ctx.bulkImportRunRepository.findById(run.id);
    expect(finalRun?.status).toBe("COMPLETED");
    expect(finalRun?.successCount).toBe(2);
    expect(finalRun?.failureCount).toBe(0);
    expect(finalRun?.processedRows).toBe(2);

    const alice = await ctx.studentRepository.findByRollNumber("BA001");
    expect(alice?.fullName).toBe("Alice");

    expect(ctx.auditRecorder.entries).toContainEqual(
      expect.objectContaining({
        action: "BULK_STUDENT_IMPORT_COMPLETED",
        targetEntityId: run.id,
        metadata: expect.objectContaining({ successCount: 2, failureCount: 0 }),
      }),
    );
    expect(alice?.private.cgpa).toBe(8.5);
  });

  it("accumulates per-row failures into errorReport without aborting the rest of the file", async () => {
    const run = await ctx.bulkImportRunRepository.create({ actorUserId: "sec-1", batchId: "11111111-1111-1111-1111-111111111111", totalRows: 2 });
    ctx.userProvisioner.seedExistingEmail("taken@x.com");
    ctx.files.set(
      "bulk-imports/mixed.csv",
      Buffer.from(`${CSV_HEADER}taken@x.com,Taken,BA003,7\nnew@x.com,New,BA004,7\n`),
    );

    await ctx.handler.handle(
      payload({ bulkImportRunId: run.id, storageKey: "bulk-imports/mixed.csv" }) as unknown as Record<string, unknown>,
    );

    const finalRun = await ctx.bulkImportRunRepository.findById(run.id);
    expect(finalRun?.status).toBe("COMPLETED_WITH_ERRORS");
    expect(finalRun?.successCount).toBe(1);
    expect(finalRun?.failureCount).toBe(1);
    expect(finalRun?.errorReport).toHaveLength(1);
    expect(finalRun?.errorReport[0]!.rollNumber).toBe("BA003");

    const created = await ctx.studentRepository.findByRollNumber("BA004");
    expect(created?.fullName).toBe("New");
  });

  it("deletes the stored CSV file after processing", async () => {
    const run = await ctx.bulkImportRunRepository.create({ actorUserId: "sec-1", batchId: "11111111-1111-1111-1111-111111111111", totalRows: 1 });
    ctx.files.set("bulk-imports/one.csv", Buffer.from(`${CSV_HEADER}alice@x.com,Alice,BA005,8\n`));

    await ctx.handler.handle(
      payload({ bulkImportRunId: run.id, storageKey: "bulk-imports/one.csv" }) as unknown as Record<string, unknown>,
    );

    expect(ctx.deletedKeys).toEqual(["bulk-imports/one.csv"]);
  });

  it("onPermanentFailure marks the run FAILED with the error message", async () => {
    const run = await ctx.bulkImportRunRepository.create({ actorUserId: "sec-1", batchId: "11111111-1111-1111-1111-111111111111", totalRows: 1 });

    await ctx.handler.onPermanentFailure(
      payload({ bulkImportRunId: run.id }) as unknown as Record<string, unknown>,
      new Error("disk unreadable"),
    );

    const finalRun = await ctx.bulkImportRunRepository.findById(run.id);
    expect(finalRun?.status).toBe("FAILED");
    expect(finalRun?.errorReport).toContainEqual(expect.objectContaining({ row: 0, error: "disk unreadable" }));
  });
});
