import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getRecruiterOverviewUseCase } from "../../infrastructure/container";

/** V4.0 C4 — GET /api/recruiters/overview, backing the /recruiter dashboard's own-activity counters. */
export const getRecruiterOverviewRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const stats = await getRecruiterOverviewUseCase.execute(actor);
      return NextResponse.json({ data: stats });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["RECRUITER"] },
);
