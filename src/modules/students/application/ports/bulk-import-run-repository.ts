import type { BulkImportRowError, BulkImportRunRecord, BulkImportRunStatus } from "../../domain/entities";

export interface CreateBulkImportRunData {
  actorUserId: string;
  batchId: string;
  totalRows: number;
}

export interface BulkImportRunRepository {
  create(data: CreateBulkImportRunData): Promise<BulkImportRunRecord>;
  findById(id: string): Promise<BulkImportRunRecord | null>;
  markRunning(id: string): Promise<BulkImportRunRecord>;
  recordRowSuccess(id: string): Promise<BulkImportRunRecord>;
  recordRowFailure(id: string, rowError: BulkImportRowError): Promise<BulkImportRunRecord>;
  complete(id: string, status: Extract<BulkImportRunStatus, "COMPLETED" | "COMPLETED_WITH_ERRORS">): Promise<BulkImportRunRecord>;
  /** Total failure — the job itself couldn't run (e.g. the stored file is unreadable), not a per-row failure. */
  markFailed(id: string, message: string): Promise<BulkImportRunRecord>;
}
