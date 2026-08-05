import type {
  BatchReportRow,
  ExportScope,
  PublicPlacementRow,
  RecruiterDirectoryRow,
  StudentDirectoryRow,
} from "../../../src/modules/exports/domain/entities";
import type { StudentDirectoryExportRepository } from "../../../src/modules/exports/application/ports/student-directory-export-repository";
import type { BatchReportExportRepository } from "../../../src/modules/exports/application/ports/batch-report-export-repository";
import type { PublicPlacementExportRepository } from "../../../src/modules/exports/application/ports/public-placement-export-repository";
import type { RecruiterDirectoryExportRepository } from "../../../src/modules/exports/application/ports/recruiter-directory-export-repository";

function withinScope(batchId: string, scope: ExportScope): boolean {
  return !scope.batchIds || scope.batchIds.includes(batchId);
}

export class InMemoryStudentDirectoryExportRepository implements StudentDirectoryExportRepository {
  private readonly rows: (StudentDirectoryRow & { batchId: string })[] = [];

  seed(row: StudentDirectoryRow & { batchId: string }): void {
    this.rows.push(row);
  }

  async fetch(scope: ExportScope): Promise<StudentDirectoryRow[]> {
    return this.rows.filter((row) => withinScope(row.batchId, scope));
  }
}

export class InMemoryBatchReportExportRepository implements BatchReportExportRepository {
  private readonly rows: (BatchReportRow & { batchId: string })[] = [];

  seed(row: BatchReportRow & { batchId: string }): void {
    this.rows.push(row);
  }

  async fetch(scope: ExportScope): Promise<BatchReportRow[]> {
    return this.rows.filter((row) => withinScope(row.batchId, scope));
  }
}

export class InMemoryPublicPlacementExportRepository implements PublicPlacementExportRepository {
  private readonly rows: (PublicPlacementRow & { batchId: string })[] = [];

  seed(row: PublicPlacementRow & { batchId: string }): void {
    this.rows.push(row);
  }

  async fetch(scope: ExportScope): Promise<PublicPlacementRow[]> {
    return this.rows.filter((row) => withinScope(row.batchId, scope));
  }
}

export class InMemoryRecruiterDirectoryExportRepository implements RecruiterDirectoryExportRepository {
  private readonly rows: RecruiterDirectoryRow[] = [];

  seed(row: RecruiterDirectoryRow): void {
    this.rows.push(row);
  }

  async fetch(): Promise<RecruiterDirectoryRow[]> {
    return this.rows;
  }
}
