import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { resolveMaintenanceIssueUseCase } from "../../infrastructure/container";
import { InvalidMaintenanceIssueTransitionError, MaintenanceIssueNotFoundError } from "../../domain/errors";
import { ResolveMaintenanceIssueRequestSchema } from "../validation";

export const resolveMaintenanceIssueRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = ResolveMaintenanceIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid resolution data", parsed.error.flatten().fieldErrors);
  }

  try {
    const issue = await resolveMaintenanceIssueUseCase.execute({
      actor,
      issueId,
      resolutionDetails: parsed.data.resolutionDetails,
    });
    return NextResponse.json({ data: issue });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidMaintenanceIssueTransitionError) return conflict(err.message);
    throw err;
  }
});
