import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { reassignMaintenanceIssueUseCase } from "../../infrastructure/container";
import { InvalidMaintenanceAssigneeError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import { ReassignMaintenanceIssueRequestSchema } from "../validation";

export const reassignMaintenanceIssueRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = ReassignMaintenanceIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid reassignment data", parsed.error.flatten().fieldErrors);
  }

  try {
    const issue = await reassignMaintenanceIssueUseCase.execute({ actor, issueId, assigneeId: parsed.data.assigneeId });
    return NextResponse.json({ data: issue });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidMaintenanceAssigneeError) return badRequest(err.message);
    throw err;
  }
});
