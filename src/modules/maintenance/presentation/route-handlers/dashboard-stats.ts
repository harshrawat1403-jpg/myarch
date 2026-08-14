import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getMaintenanceDashboardStatsUseCase } from "../../infrastructure/container";

export const getMaintenanceDashboardStatsRouteHandler = withAuth(async (_req, { actor }) => {
  try {
    const stats = await getMaintenanceDashboardStatsUseCase.execute({ actor });
    return NextResponse.json({ data: stats });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
