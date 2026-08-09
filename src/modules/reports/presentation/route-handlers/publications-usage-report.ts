import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPublicationsUsageReportUseCase } from "../../infrastructure/container";
import { PublicationsUsageReportQuerySchema } from "../validation";
import { PUBLICATIONS_BREAKDOWN_COLUMNS, publicationsBreakdownRows } from "../columns";
import { renderReportPptx } from "../../infrastructure/export/render-report-pptx";
import { respondWithReport } from "../respond-with-report";

/** V4.0 E7 (PRD §16 — "New report types: ... Publications usage"). Secretary/Coordinator only (canManagePublications, enforced in the use case). */
export const getPublicationsUsageReportRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = PublicationsUsageReportQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid report query", parsed.error.flatten().fieldErrors);

  try {
    const report = await getPublicationsUsageReportUseCase.execute({ actor, filters: { type: parsed.data.type } });
    if (!parsed.data.format) return NextResponse.json({ data: report });

    return respondWithReport(parsed.data.format, {
      filePrefix: "publications-usage-report",
      sheetName: "Publications Usage",
      csvXlsx: () => ({ rows: publicationsBreakdownRows(report), columns: PUBLICATIONS_BREAKDOWN_COLUMNS }),
      pptx: () =>
        renderReportPptx({
          title: "Publications Usage Report",
          subtitle: `Generated ${new Date().toLocaleDateString()}`,
          metrics: [{ label: "Total Publications", value: report.totalPublications }],
          tables: [
            {
              title: "By Status",
              columns: ["Status", "Count"],
              rows: report.byStatus.map((s) => [s.status, String(s.count)]),
            },
            {
              title: "By Type",
              columns: ["Type", "Count"],
              rows: report.byType.map((t) => [t.type, String(t.count)]),
            },
            {
              title: "Exports by Format",
              columns: ["Format", "Count"],
              rows: report.exportsByFormat.map((e) => [e.format, String(e.count)]),
            },
          ],
        }),
    });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
