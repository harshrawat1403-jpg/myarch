import type { BatchReportRow, ExportScope } from "../../domain/entities";

export interface BatchReportExportRepository {
  fetch(scope: ExportScope): Promise<BatchReportRow[]>;
}
