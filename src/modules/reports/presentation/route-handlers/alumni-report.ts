import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getAlumniReportUseCase } from "../../infrastructure/container";
import { AlumniReportQuerySchema } from "../validation";
import { ALUMNI_BY_YEAR_COLUMNS } from "../columns";
import { renderReportPptx } from "../../infrastructure/export/render-report-pptx";
import { respondWithReport } from "../respond-with-report";

/** V4.0 E7 (PRD §16 — "New report types: ... Alumni"). Secretary/Coordinator only (canManageAlumni, enforced in the use case). */
export const getAlumniReportRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = AlumniReportQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid report query", parsed.error.flatten().fieldErrors);

  try {
    const report = await getAlumniReportUseCase.execute({
      actor,
      filters: {
        graduationYearFrom: parsed.data.graduationYearFrom,
        graduationYearTo: parsed.data.graduationYearTo,
        mentorshipAvailableOnly: parsed.data.mentorshipAvailableOnly,
      },
    });
    if (!parsed.data.format) return NextResponse.json({ data: report });

    return respondWithReport(parsed.data.format, {
      filePrefix: "alumni-report",
      sheetName: "Alumni by Graduation Year",
      csvXlsx: () => ({ rows: report.byGraduationYear, columns: ALUMNI_BY_YEAR_COLUMNS }),
      pptx: () =>
        renderReportPptx({
          title: "Alumni Report",
          subtitle: `Generated ${new Date().toLocaleDateString()}`,
          metrics: [
            { label: "Total Alumni", value: report.totalAlumni },
            { label: "Available for Mentorship", value: report.mentorshipAvailableCount },
          ],
          tables: [
            {
              title: "Alumni by Graduation Year",
              columns: ["Graduation Year", "Alumni Count"],
              rows: report.byGraduationYear.map((r) => [String(r.graduationYear), String(r.count)]),
            },
          ],
        }),
    });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
