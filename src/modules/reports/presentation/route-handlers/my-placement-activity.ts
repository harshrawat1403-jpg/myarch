import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getMyPlacementActivityUseCase } from "../../infrastructure/container";
import { MyActivityReportQuerySchema } from "../validation";
import { MY_APPLICATIONS_COLUMNS } from "../columns";
import { respondWithReport } from "../respond-with-report";

/** V4.0 E7 (PRD §4 — Student Reports: "Own data only") — no `roles` restriction at withAuth; the use case itself is what enforces "only STUDENT, only their own studentProfileId." */
export const getMyPlacementActivityRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = MyActivityReportQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid report query", parsed.error.flatten().fieldErrors);

  try {
    const report = await getMyPlacementActivityUseCase.execute(actor);
    if (!parsed.data.format) return NextResponse.json({ data: report });

    return respondWithReport(parsed.data.format, {
      filePrefix: "my-placement-activity",
      sheetName: "My Applications",
      csvXlsx: () => ({ rows: report.applications, columns: MY_APPLICATIONS_COLUMNS }),
    });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
