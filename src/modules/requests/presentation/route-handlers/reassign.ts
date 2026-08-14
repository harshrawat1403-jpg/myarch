import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { reassignRequestUseCase } from "../../infrastructure/container";
import { InvalidRequestOwnerError, RequestNotFoundError } from "../../domain/errors";
import { ReassignRequestRequestSchema } from "../validation";

export const reassignRequestRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = ReassignRequestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid reassignment data", parsed.error.flatten().fieldErrors);
  }

  try {
    const request = await reassignRequestUseCase.execute({ actor, requestId, ownerId: parsed.data.ownerId });
    return NextResponse.json({ data: request });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidRequestOwnerError) return badRequest(err.message);
    throw err;
  }
});
