import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { BatchLookup } from "@/lib/batch-lookup";
import { parseCsv } from "@/lib/csv-parse";
import { BatchNotAssignableError, BatchNotFoundError, EmptyCsvFileError } from "../../domain/errors";
import type { BulkImportRunRepository } from "../ports/bulk-import-run-repository";

export const BULK_IMPORT_STUDENTS_JOB_TYPE = "BULK_IMPORT_STUDENTS";

/** The payload enqueued for a BULK_IMPORT_STUDENTS job — the actor's role/batchScope travel with it since the job runs outside any HTTP request context and has no session to re-derive them from. */
export interface BulkImportStudentsJobPayload {
  readonly bulkImportRunId: string;
  readonly storageKey: string;
  readonly batchId: string;
  readonly actor: {
    readonly userId: string;
    readonly role: "SECRETARY" | "COORDINATOR";
    readonly batchScope?: readonly string[];
  };
}

export interface StartBulkImportInput {
  actor: AuthenticatedActor;
  batchId: string;
  fileData: Buffer;
}

export interface StartBulkImportResult {
  bulkImportRunId: string;
  totalRows: number;
}

export interface StartBulkImportUseCaseDeps {
  batchLookup: BatchLookup;
  bulkImportRunRepository: BulkImportRunRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
  dispatchJob(payload: BulkImportStudentsJobPayload): Promise<{ jobId: string }>;
}

/**
 * Validates the batch and the CSV shape up front (fast, synchronous
 * feedback to the Secretary/Coordinator uploading the file), then hands off
 * the actual per-row student creation to BulkImportStudentsJobHandler via
 * the job queue — a multi-hundred-row roster must never tie up an HTTP
 * request. Only counts rows and saves the file here; CreateStudentUseCase
 * itself validates and creates each row, inside the job.
 */
export class StartBulkImportUseCase {
  constructor(private readonly deps: StartBulkImportUseCaseDeps) {}

  async execute(input: StartBulkImportInput): Promise<StartBulkImportResult> {
    if (!canEditPrivateAdminFields(input.actor, input.batchId)) {
      throw new NotAuthorizedError("Not authorized to import students into this batch");
    }

    const batch = await this.deps.batchLookup.findById(input.batchId);
    if (!batch) throw new BatchNotFoundError();
    if (batch.status === "ARCHIVED") {
      throw new BatchNotAssignableError("batch is archived");
    }

    const rows = parseCsv(input.fileData.toString("utf-8"));
    if (rows.length === 0) throw new EmptyCsvFileError();

    const run = await this.deps.bulkImportRunRepository.create({
      actorUserId: input.actor.userId,
      batchId: input.batchId,
      totalRows: rows.length,
    });

    const storageKey = `bulk-imports/${run.id}.csv`;
    await this.deps.saveFile(storageKey, input.fileData);

    await this.deps.dispatchJob({
      bulkImportRunId: run.id,
      storageKey,
      batchId: input.batchId,
      actor: {
        userId: input.actor.userId,
        role: input.actor.role as "SECRETARY" | "COORDINATOR",
        ...(input.actor.batchScope ? { batchScope: input.actor.batchScope } : {}),
      },
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.BULK_STUDENT_IMPORT_STARTED,
      targetEntityType: "BulkImportRun",
      targetEntityId: run.id,
      metadata: { batchId: input.batchId, totalRows: rows.length },
    });

    return { bulkImportRunId: run.id, totalRows: rows.length };
  }
}
