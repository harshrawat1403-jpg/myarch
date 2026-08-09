import type { PublicationExportFormat, PublicationExportStatus, PublicationStatus, PublicationType } from "@/modules/publications";
import type { PublicationsUsageReportFilters } from "../../domain/entities";

export interface PublicationsUsageCounts {
  readonly totalPublications: number;
  readonly byStatus: readonly { readonly status: PublicationStatus; readonly count: number }[];
  readonly byType: readonly { readonly type: PublicationType; readonly count: number }[];
  readonly exportsByFormat: readonly { readonly format: PublicationExportFormat; readonly count: number }[];
  readonly exportsByStatus: readonly { readonly status: PublicationExportStatus; readonly count: number }[];
}

export interface PublicationsReportRepository {
  getSummary(filters: PublicationsUsageReportFilters): Promise<PublicationsUsageCounts>;
}
