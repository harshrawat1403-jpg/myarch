import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { escalateTaskUseCase } from "../../infrastructure/container";
import { TaskNotFoundError } from "../../domain/errors";

export const escalateTaskRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const taskId = await extractRouteParam(routeContext, "id");
  if (!taskId) return notFound("Task not found");

  try {
    const task = await escalateTaskUseCase.execute({ actor, taskId });
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof TaskNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
