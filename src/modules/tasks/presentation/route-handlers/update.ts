import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateTaskUseCase } from "../../infrastructure/container";
import { TaskNotFoundError } from "../../domain/errors";
import { UpdateTaskRequestSchema } from "../validation";

export const updateTaskRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const taskId = await extractRouteParam(routeContext, "id");
  if (!taskId) return notFound("Task not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateTaskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid task data", parsed.error.flatten().fieldErrors);
  }

  try {
    const task = await updateTaskUseCase.execute({ actor, taskId, ...parsed.data });
    return NextResponse.json({ data: task });
  } catch (err) {
    if (err instanceof TaskNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
