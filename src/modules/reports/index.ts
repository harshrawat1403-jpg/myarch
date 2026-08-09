/**
 * Public exports of the reports module. Other modules must import only
 * from here — never reach into reports/domain, reports/application, or
 * reports/infrastructure directly (docs/architecture/07_Repository_Structure.md).
 */

export type {
  PlacementFunnelReport,
  PlacementReportFilters,
  MyPlacementActivityReport,
  MyRecruitingActivityReport,
  AlumniReport,
  AlumniReportFilters,
  PublicationsUsageReport,
  PublicationsUsageReportFilters,
} from "./domain/entities";

export { getPlacementFunnelReportRouteHandler } from "./presentation/route-handlers/placement-funnel";
export { getMyPlacementActivityRouteHandler } from "./presentation/route-handlers/my-placement-activity";
export { getMyRecruitingActivityRouteHandler } from "./presentation/route-handlers/my-recruiting-activity";
export { getAlumniReportRouteHandler } from "./presentation/route-handlers/alumni-report";
export { getPublicationsUsageReportRouteHandler } from "./presentation/route-handlers/publications-usage-report";
