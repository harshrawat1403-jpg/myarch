import crypto from "node:crypto";
import type { BulkImportRowError, BulkImportRunRecord, BulkImportRunStatus } from "../../../src/modules/students";
import type {
  BulkImportRunRepository,
  CreateBulkImportRunData,
} from "../../../src/modules/students/application/ports/bulk-import-run-repository";

export class InMemoryBulkImportRunRepository implements BulkImportRunRepository {
  private readonly byId = new Map<string, BulkImportRunRecord>();

  seed(record: BulkImportRunRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateBulkImportRunData): Promise<BulkImportRunRecord> {
    const record: BulkImportRunRecord = {
      id: crypto.randomUUID(),
      actorUserId: data.actorUserId,
      batchId: data.batchId,
      status: "PENDING",
      totalRows: data.totalRows,
      processedRows: 0,
      successCount: 0,
      failureCount: 0,
      errorReport: [],
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<BulkImportRunRecord | null> {
    return this.byId.get(id) ?? null;
  }

  private update(id: string, patch: Partial<BulkImportRunRecord>): BulkImportRunRecord {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, ...patch };
    this.byId.set(id, updated);
    return updated;
  }

  async markRunning(id: string): Promise<BulkImportRunRecord> {
    return this.update(id, { status: "RUNNING", startedAt: new Date() });
  }

  async recordRowSuccess(id: string): Promise<BulkImportRunRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    return this.update(id, {
      processedRows: existing.processedRows + 1,
      successCount: existing.successCount + 1,
    });
  }

  async recordRowFailure(id: string, rowError: BulkImportRowError): Promise<BulkImportRunRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    return this.update(id, {
      processedRows: existing.processedRows + 1,
      failureCount: existing.failureCount + 1,
      errorReport: [...existing.errorReport, rowError],
    });
  }

  async complete(
    id: string,
    status: Extract<BulkImportRunStatus, "COMPLETED" | "COMPLETED_WITH_ERRORS">,
  ): Promise<BulkImportRunRecord> {
    return this.update(id, { status, completedAt: new Date() });
  }

  async markFailed(id: string, message: string): Promise<BulkImportRunRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    return this.update(id, {
      status: "FAILED",
      completedAt: new Date(),
      errorReport: [...existing.errorReport, { row: 0, error: message }],
    });
  }
}
