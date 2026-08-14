import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { assignMaintenanceIssueUseCase } from "../../infrastructure/container";
import {
  InvalidMaintenanceAssigneeError,
  InvalidMaintenanceIssueTransitionError,
  MaintenanceIssueNotFoundError,
} from "../../domain/errors";
import { AssignMaintenanceIssueRequestSchema } from "../validation";

export const assignMaintenanceIssueRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AssignMaintenanceIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid assignment data", parsed.error.flatten().fieldErrors);
  }

  try {
    const issue = await assignMaintenanceIssueUseCase.execute({
      actor,
      issueId,
      assigneeId: parsed.data.assigneeId,
      deadline: parsed.data.deadline,
    });
    return NextResponse.json({ data: issue });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidMaintenanceAssigneeError) return badRequest(err.message);
    if (err instanceof InvalidMaintenanceIssueTransitionError) return conflict(err.message);
    throw err;
  }
});
