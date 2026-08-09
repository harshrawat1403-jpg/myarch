import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getMyRecruitingActivityUseCase } from "../../infrastructure/container";
import { MyActivityReportQuerySchema } from "../validation";
import { MY_INTERESTS_COLUMNS } from "../columns";
import { respondWithReport } from "../respond-with-report";

/** V4.0 E7 (PRD §4 — Recruiter Reports: "Own data only"). */
export const getMyRecruitingActivityRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = MyActivityReportQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid report query", parsed.error.flatten().fieldErrors);

  try {
    const report = await getMyRecruitingActivityUseCase.execute(actor);
    if (!parsed.data.format) return NextResponse.json({ data: report });

    return respondWithReport(parsed.data.format, {
      filePrefix: "my-recruiting-activity",
      sheetName: "My Interests Sent",
      csvXlsx: () => ({ rows: report.interests, columns: MY_INTERESTS_COLUMNS }),
    });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
