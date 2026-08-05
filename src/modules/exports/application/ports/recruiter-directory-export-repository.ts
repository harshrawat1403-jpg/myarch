import type { RecruiterDirectoryRow } from "../../domain/entities";

export interface RecruiterDirectoryExportRepository {
  /** No batch scope — recruiters have no batch dimension; see the use case for why this export is Secretary-only. */
  fetch(): Promise<RecruiterDirectoryRow[]>;
}
