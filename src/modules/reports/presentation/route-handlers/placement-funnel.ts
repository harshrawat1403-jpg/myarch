import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPlacementFunnelReportUseCase } from "../../infrastructure/container";
import { PlacementReportQuerySchema } from "../validation";
import { PLACEMENT_COMPANIES_COLUMNS } from "../columns";
import { renderReportPptx } from "../../infrastructure/export/render-report-pptx";
import { respondWithReport } from "../respond-with-report";

/** V4.0 E7 (PRD §16) — Placements/Internships institutional report; `type` selects which (same aggregation, one query shape — PlacementDrive.type is a variant of one entity, per D1). No `roles` restriction at withAuth: Secretary/Coordinator get the institutional view, the use case itself throws for any other role (defense-in-depth, matching this codebase's established pattern). */
export const getPlacementFunnelReportRouteHandler = withAuth(async (req, { actor }) => {
  const query = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = PlacementReportQuerySchema.safeParse(query);
  if (!parsed.success) return badRequest("Invalid report query", parsed.error.flatten().fieldErrors);

  try {
    const report = await getPlacementFunnelReportUseCase.execute({
      actor,
      filters: { type: parsed.data.type, batchIds: parsed.data.batchIds, dateFrom: parsed.data.dateFrom, dateTo: parsed.data.dateTo },
    });

    if (!parsed.data.format) return NextResponse.json({ data: report });

    const filePrefix = report.type === "PLACEMENT" ? "placements-report" : "internships-report";
    const reportLabel = report.type === "PLACEMENT" ? "Placement Report" : "Internship Report";

    return respondWithReport(parsed.data.format, {
      filePrefix,
      sheetName: `${reportLabel} — Companies`,
      csvXlsx: () => ({ rows: report.companiesRecruited, columns: PLACEMENT_COMPANIES_COLUMNS }),
      pptx: () =>
        renderReportPptx({
          title: reportLabel,
          subtitle: `Generated ${new Date().toLocaleDateString()}`,
          metrics: [
            { label: "Applied", value: report.applied },
            { label: "Reached Shortlisted", value: report.reachedShortlisted },
            { label: "Reached Interview", value: report.reachedInterview },
            { label: "Reached Offer", value: report.reachedOffer },
            { label: "Placed", value: report.placed },
            { label: "Interviews Scheduled", value: report.interviewsScheduled },
          ],
          tables: [
            {
              title: "Companies Recruited",
              columns: ["Company", "Offers Extended", "Accepted / Placed"],
              rows: report.companiesRecruited.map((c) => [c.companyName, String(c.offersCount), String(c.acceptedCount)]),
            },
            {
              title: "Current Status Breakdown",
              columns: ["Status", "Count"],
              rows: report.currentStatusBreakdown.map((s) => [s.status, String(s.count)]),
            },
          ],
        }),
    });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
