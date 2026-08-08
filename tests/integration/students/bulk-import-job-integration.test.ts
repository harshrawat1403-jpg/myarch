/**
 * End-to-end exercise of the real wiring (no fakes standing in for
 * StartBulkImportUseCase, JobRegistry, or JobWorker themselves — only leaf
 * infrastructure ports are faked, the same no-live-database constraint as
 * every other integration test in this project):
 *
 *   StartBulkImportUseCase.execute()
 *     -> BulkImportRun row (PENDING) + BULK_IMPORT_STUDENTS job enqueued
 *     -> JobWorker.pollOnce() claims it
 *     -> BulkImportStudentsJobHandler.handle() parses the CSV and calls the
 *        real CreateStudentUseCase once per row
 *     -> BulkImportRun marked COMPLETED / COMPLETED_WITH_ERRORS
 */
import { describe, expect, it } from "vitest";
import { JobRegistry, JobWorker } from "../../../src/modules/jobs";
import { DefaultJobDispatcher } from "../../../src/modules/jobs/application/default-job-dispatcher";
import { StartBulkImportUseCase } from "../../../src/modules/students/application/use-cases/start-bulk-import";
import { BULK_IMPORT_STUDENTS_JOB_TYPE } from "../../../src/modules/students/application/use-cases/start-bulk-import";
import { CreateStudentUseCase } from "../../../src/modules/students/application/use-cases/create-student";
import { BulkImportStudentsJobHandler } from "../../../src/modules/students/infrastructure/bulk-import-job-handler";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { InMemoryBulkImportRunRepository } from "../../support/fakes/in-memory-bulk-import-run-repository";
import { FakeUserProvisioner } from "../../support/fakes/fake-user-provisioner";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeJobLogger } from "../../support/fakes/fake-job-logger";
import { FakeJobMetricsRecorder } from "../../support/fakes/fake-job-metrics-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const BATCH_ID = "11111111-1111-1111-1111-111111111111";

function buildWorld() {
  const jobRepository = new InMemoryJobRepository();
  const jobRegistry = new JobRegistry();
  const jobDispatcher = new DefaultJobDispatcher({ jobRepository });

  const studentRepository = new InMemoryStudentRepository();
  const batchLookup = new InMemoryBatchLookup();
  batchLookup.seed(BATCH_ID, "ACTIVE");
  const userProvisioner = new FakeUserProvisioner();
  const bulkImportRunRepository = new InMemoryBulkImportRunRepository();
  const auditRecorder = new FakeAuditRecorder();

  const createStudentUseCase = new CreateStudentUseCase({ studentRepository, batchLookup, userProvisioner });

  const files = new Map<string, Buffer>();
  const startBulkImportUseCase = new StartBulkImportUseCase({
    batchLookup,
    bulkImportRunRepository,
    auditRecorder,
    saveFile: async (storageKey, data) => {
      files.set(storageKey, data);
    },
    dispatchJob: (payload) => jobDispatcher.dispatch(BULK_IMPORT_STUDENTS_JOB_TYPE, payload as unknown as Record<string, unknown>, { maxAttempts: 1 }),
  });

  jobRegistry.register(
    new BulkImportStudentsJobHandler({
      bulkImportRunRepository,
      createStudentUseCase,
      auditRecorder,
      readFile: async (storageKey) => files.get(storageKey)!,
      deleteFile: async (storageKey) => {
        files.delete(storageKey);
      },
    }),
  );

  const worker = new JobWorker(
    { jobRepository, jobRegistry, logger: new FakeJobLogger(), metrics: new FakeJobMetricsRecorder() },
    { batchSize: 5 },
  );

  return { startBulkImportUseCase, worker, jobRepository, bulkImportRunRepository, studentRepository, files };
}

describe("Bulk Import -> Job -> Worker -> CreateStudentUseCase — end to end", () => {
  it("imports every valid row through the full job pipeline and marks the run COMPLETED", async () => {
    const world = buildWorld();
    const csv = Buffer.from("email,fullName,rollNumber,cgpa\nalice@x.com,Alice,BA001,8.5\nbob@x.com,Bob,BA002,7.2\n");

    const result = await world.startBulkImportUseCase.execute({ actor: SECRETARY, batchId: BATCH_ID, fileData: csv });

    // execute() only enqueues — nothing imported yet.
    expect((await world.bulkImportRunRepository.findById(result.bulkImportRunId))!.status).toBe("PENDING");
    expect(world.jobRepository.jobs[0]!.type).toBe(BULK_IMPORT_STUDENTS_JOB_TYPE);

    const claimed = await world.worker.pollOnce();

    expect(claimed).toBe(1);
    const run = await world.bulkImportRunRepository.findById(result.bulkImportRunId);
    expect(run!.status).toBe("COMPLETED");
    expect(run!.successCount).toBe(2);
    expect(run!.failureCount).toBe(0);
    expect(world.jobRepository.jobs[0]!.status).toBe("COMPLETED");

    expect(await world.studentRepository.findByRollNumber("BA001")).not.toBeNull();
    expect(await world.studentRepository.findByRollNumber("BA002")).not.toBeNull();
  });

  it("marks the run COMPLETED_WITH_ERRORS when some rows fail, without losing the valid ones", async () => {
    const world = buildWorld();
    const csv = Buffer.from(
      "email,fullName,rollNumber,cgpa\nalice@x.com,Alice,BA001,8.5\nnot-an-email,Bad Row,BA002,7\n",
    );

    const result = await world.startBulkImportUseCase.execute({ actor: SECRETARY, batchId: BATCH_ID, fileData: csv });
    await world.worker.pollOnce();

    const run = await world.bulkImportRunRepository.findById(result.bulkImportRunId);
    expect(run!.status).toBe("COMPLETED_WITH_ERRORS");
    expect(run!.successCount).toBe(1);
    expect(run!.failureCount).toBe(1);
    expect(run!.errorReport[0]!.rollNumber).toBe("BA002");
    expect(await world.studentRepository.findByRollNumber("BA001")).not.toBeNull();
  });

  it("deletes the uploaded CSV from storage once the job completes", async () => {
    const world = buildWorld();
    const csv = Buffer.from("email,fullName,rollNumber,cgpa\nalice@x.com,Alice,BA001,8.5\n");

    const result = await world.startBulkImportUseCase.execute({ actor: SECRETARY, batchId: BATCH_ID, fileData: csv });
    expect(world.files.size).toBe(1);

    await world.worker.pollOnce();

    expect(world.files.size).toBe(0);
    void result;
  });
});
