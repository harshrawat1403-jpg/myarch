import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { reopenMaintenanceIssueUseCase } from "../../infrastructure/container";
import { MaintenanceIssueNotFoundError, MaintenanceIssueNotReopenableError } from "../../domain/errors";

export const reopenMaintenanceIssueRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  try {
    const issue = await reopenMaintenanceIssueUseCase.execute({ actor, issueId });
    return NextResponse.json({ data: issue });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof MaintenanceIssueNotReopenableError) return conflict(err.message);
    throw err;
  }
});
