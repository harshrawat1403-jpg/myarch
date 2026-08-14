import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateMaintenanceIssueUseCase } from "../../infrastructure/container";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";
import { UpdateMaintenanceIssueRequestSchema } from "../validation";

export const updateMaintenanceIssueRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateMaintenanceIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid issue data", parsed.error.flatten().fieldErrors);
  }

  try {
    const issue = await updateMaintenanceIssueUseCase.execute({ actor, issueId, ...parsed.data });
    return NextResponse.json({ data: issue });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
