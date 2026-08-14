import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { reopenTaskUseCase } from "../../infrastructure/container";
import { TaskNotFoundError, TaskNotReopenableError } from "../../domain/errors";

export const reopenTaskRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const taskId = await extractRouteParam(routeContext, "id");
  if (!taskId) return notFound("Task not found");

  try {
    const task = await reopenTaskUseCase.execute({ actor, taskId });
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof TaskNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof TaskNotReopenableError) return conflict(err.message);
    throw err;
  }
});
