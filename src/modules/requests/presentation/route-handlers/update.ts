import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateRequestUseCase } from "../../infrastructure/container";
import { RequestNotFoundError } from "../../domain/errors";
import { UpdateRequestRequestSchema } from "../validation";

export const updateRequestRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateRequestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid request data", parsed.error.flatten().fieldErrors);
  }

  try {
    const request = await updateRequestUseCase.execute({ actor, requestId, ...parsed.data });
    return NextResponse.json({ data: request });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
