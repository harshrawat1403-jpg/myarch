import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addTaskCommentUseCase } from "../../infrastructure/container";
import { TaskCommentBodyRequiredError, TaskNotFoundError } from "../../domain/errors";
import { AddTaskCommentRequestSchema } from "../validation";

export const addTaskCommentRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const taskId = await extractRouteParam(routeContext, "id");
  if (!taskId) return notFound("Task not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddTaskCommentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid comment data", parsed.error.flatten().fieldErrors);
  }

  try {
    const comment = await addTaskCommentUseCase.execute({ actor, taskId, body: parsed.data.body });
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    if (err instanceof TaskNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof TaskCommentBodyRequiredError) return badRequest(err.message);
    throw err;
  }
});
