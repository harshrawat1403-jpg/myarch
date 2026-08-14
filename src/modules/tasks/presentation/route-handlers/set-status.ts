import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setTaskStatusUseCase } from "../../infrastructure/container";
import { InvalidTaskStatusTransitionError, TaskNotFoundError } from "../../domain/errors";
import { SetTaskStatusRequestSchema } from "../validation";

/** Handles every forward transition — "complete" is status: "DONE", "cancel" is status: "CANCELLED" (see SetTaskStatusUseCase's own doc comment). */
export const setTaskStatusRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const taskId = await extractRouteParam(routeContext, "id");
  if (!taskId) return notFound("Task not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = SetTaskStatusRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid status data", parsed.error.flatten().fieldErrors);
  }

  try {
    const task = await setTaskStatusUseCase.execute({ actor, taskId, status: parsed.data.status });
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof TaskNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidTaskStatusTransitionError) return conflict(err.message);
    throw err;
  }
});
