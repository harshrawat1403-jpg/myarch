import type { PublicationsUsageReportFilters } from "../../../src/modules/reports/domain/entities";
import type { PublicationsReportRepository, PublicationsUsageCounts } from "../../../src/modules/reports/application/ports/publications-report-repository";

const EMPTY: PublicationsUsageCounts = { totalPublications: 0, byStatus: [], byType: [], exportsByFormat: [], exportsByStatus: [] };

export class FakePublicationsReportRepository implements PublicationsReportRepository {
  result: PublicationsUsageCounts = EMPTY;
  readonly calls: PublicationsUsageReportFilters[] = [];

  async getSummary(filters: PublicationsUsageReportFilters): Promise<PublicationsUsageCounts> {
    this.calls.push(filters);
    return this.result;
  }
}
