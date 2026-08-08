import type { JobHandler } from "@/modules/jobs";
import type { AuthenticatedActor } from "@/modules/auth";
import { parseCsv } from "@/lib/csv-parse";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { BULK_IMPORT_STUDENTS_JOB_TYPE } from "../application/use-cases/start-bulk-import";
import type { BulkImportStudentsJobPayload } from "../application/use-cases/start-bulk-import";
import type { CreateStudentUseCase } from "../application/use-cases/create-student";
import type { BulkImportRunRepository } from "../application/ports/bulk-import-run-repository";
import { CreateStudentRequestSchema } from "../presentation/validation";

function mapCsvRowToStudentPayload(row: Record<string, string>, batchId: string): unknown {
  const cgpaRaw = row.cgpa?.trim();
  return {
    email: row.email?.trim(),
    fullName: row.fullName?.trim(),
    rollNumber: row.rollNumber?.trim(),
    batchId,
    private: {
      phone: row.phone?.trim() || undefined,
      personalEmail: row.personalEmail?.trim() || undefined,
      cgpa: cgpaRaw ? Number(cgpaRaw) : undefined,
    },
  };
}

/**
 * Registered against BULK_IMPORT_STUDENTS in the shared JobRegistry (see
 * infrastructure/container.ts's registerBulkImportJobHandlers()). Calls the
 * existing CreateStudentUseCase once per row — never re-implements its
 * batch/duplicate/permission checks — and accumulates per-row failures into
 * BulkImportRun.errorReport rather than aborting the whole file on the
 * first bad row (mirrors runBulkOperation's per-item try/catch shape).
 * Deliberately does NOT let a single row's failure throw out of handle():
 * a bad row is expected, ordinary input, not a transient infrastructure
 * failure — JobWorker's retry/dead-letter machinery is reserved for actual
 * job-level failures (e.g. the stored CSV file itself is unreadable).
 */
export class BulkImportStudentsJobHandler implements JobHandler {
  readonly type = BULK_IMPORT_STUDENTS_JOB_TYPE;

  constructor(
    private readonly deps: {
      bulkImportRunRepository: BulkImportRunRepository;
      createStudentUseCase: CreateStudentUseCase;
      auditRecorder: AuditRecorder;
      readFile: (storageKey: string) => Promise<Buffer>;
      deleteFile: (storageKey: string) => Promise<void>;
    },
  ) {}

  async handle(rawPayload: Record<string, unknown>): Promise<void> {
    const payload = rawPayload as unknown as BulkImportStudentsJobPayload;
    const run = await this.deps.bulkImportRunRepository.findById(payload.bulkImportRunId);
    if (!run) return; // Run was deleted/never existed — nothing retryable here.

    await this.deps.bulkImportRunRepository.markRunning(run.id);

    const actor: AuthenticatedActor = {
      userId: payload.actor.userId,
      role: payload.actor.role,
      ...(payload.actor.batchScope ? { batchScope: payload.actor.batchScope } : {}),
    };

    const fileBuffer = await this.deps.readFile(payload.storageKey);
    const rows = parseCsv(fileBuffer.toString("utf-8"));

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // header is row 1
      try {
        const parsed = CreateStudentRequestSchema.safeParse(mapCsvRowToStudentPayload(row, payload.batchId));
        if (!parsed.success) {
          const [firstIssue] = parsed.error.issues;
          throw new Error(firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid row");
        }
        await this.deps.createStudentUseCase.execute({ actor, ...parsed.data });
        await this.deps.bulkImportRunRepository.recordRowSuccess(run.id);
      } catch (err) {
        await this.deps.bulkImportRunRepository.recordRowFailure(run.id, {
          row: rowNumber,
          rollNumber: row.rollNumber,
          email: row.email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const finished = await this.deps.bulkImportRunRepository.findById(run.id);
    await this.deps.bulkImportRunRepository.complete(
      run.id,
      finished && finished.failureCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
    );

    await this.deps.auditRecorder.record({
      actorUserId: run.actorUserId,
      action: AUDIT_ACTIONS.BULK_STUDENT_IMPORT_COMPLETED,
      targetEntityType: "BulkImportRun",
      targetEntityId: run.id,
      metadata: {
        successCount: finished?.successCount ?? 0,
        failureCount: finished?.failureCount ?? 0,
      },
    });

    await this.deps.deleteFile(payload.storageKey).catch(() => {
      // Best-effort disk cleanup — an orphaned upload file is a minor leak,
      // never worth failing an otherwise-successful import over.
    });
  }

  async onPermanentFailure(rawPayload: Record<string, unknown>, error: Error): Promise<void> {
    const payload = rawPayload as unknown as BulkImportStudentsJobPayload;
    await this.deps.bulkImportRunRepository.markFailed(payload.bulkImportRunId, error.message);
  }
}
