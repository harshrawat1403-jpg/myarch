import type { PlacementReportFilters } from "../../../src/modules/reports/domain/entities";
import type { MyApplicationRow, PlacementFunnelCounts, PlacementReportRepository } from "../../../src/modules/reports/application/ports/placement-report-repository";

const EMPTY_FUNNEL: PlacementFunnelCounts = {
  applied: 0,
  reachedShortlisted: 0,
  reachedInterview: 0,
  reachedOffer: 0,
  reachedAccepted: 0,
  interviewsScheduled: 0,
  currentStatusBreakdown: [],
  companiesRecruited: [],
};

export class FakePlacementReportRepository implements PlacementReportRepository {
  funnelResult: PlacementFunnelCounts = EMPTY_FUNNEL;
  myApplications: Record<string, readonly MyApplicationRow[]> = {};
  readonly calls: { method: string; args: unknown[] }[] = [];

  async getFunnel(filters: PlacementReportFilters): Promise<PlacementFunnelCounts> {
    this.calls.push({ method: "getFunnel", args: [filters] });
    return this.funnelResult;
  }

  async listMyApplications(studentProfileId: string): Promise<readonly MyApplicationRow[]> {
    this.calls.push({ method: "listMyApplications", args: [studentProfileId] });
    return this.myApplications[studentProfileId] ?? [];
  }
}
