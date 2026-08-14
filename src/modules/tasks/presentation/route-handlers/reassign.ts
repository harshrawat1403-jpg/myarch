import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { reassignTaskUseCase } from "../../infrastructure/container";
import { CannotAssignTaskToRoleError, TaskNotFoundError } from "../../domain/errors";
import { ReassignTaskRequestSchema } from "../validation";

export const reassignTaskRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const taskId = await extractRouteParam(routeContext, "id");
  if (!taskId) return notFound("Task not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = ReassignTaskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid reassignment data", parsed.error.flatten().fieldErrors);
  }

  try {
    const task = await reassignTaskUseCase.execute({ actor, taskId, newOwnerId: parsed.data.newOwnerId });
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof TaskNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof CannotAssignTaskToRoleError) return forbidden(err.message);
    throw err;
  }
});
