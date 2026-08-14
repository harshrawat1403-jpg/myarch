import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getMaintenanceIssueUseCase } from "../../infrastructure/container";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";

export const getMaintenanceIssueRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  try {
    const result = await getMaintenanceIssueUseCase.execute({ actor, issueId });
    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
