import type { ExportScope, StudentDirectoryRow } from "../../domain/entities";

export interface StudentDirectoryExportRepository {
  fetch(scope: ExportScope): Promise<StudentDirectoryRow[]>;
}
