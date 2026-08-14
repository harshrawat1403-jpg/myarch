import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addMaintenanceIssueUpdateUseCase } from "../../infrastructure/container";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";
import { AddMaintenanceIssueUpdateRequestSchema } from "../validation";

export const addMaintenanceIssueUpdateRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddMaintenanceIssueUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid update data", parsed.error.flatten().fieldErrors);
  }

  try {
    const comment = await addMaintenanceIssueUpdateUseCase.execute({ actor, issueId, body: parsed.data.body });
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
