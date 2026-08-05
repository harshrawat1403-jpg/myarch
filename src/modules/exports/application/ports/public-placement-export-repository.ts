import type { ExportScope, PublicPlacementRow } from "../../domain/entities";

export interface PublicPlacementExportRepository {
  fetch(scope: ExportScope): Promise<PublicPlacementRow[]>;
}
