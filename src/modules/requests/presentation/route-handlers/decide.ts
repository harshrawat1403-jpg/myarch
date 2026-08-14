import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { decideRequestUseCase } from "../../infrastructure/container";
import { InvalidRequestTransitionError, RequestAlreadyDecidedError, RequestNotFoundError } from "../../domain/errors";
import { DecideRequestRequestSchema } from "../validation";

export const decideRequestRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = DecideRequestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid decision data", parsed.error.flatten().fieldErrors);
  }

  try {
    const request = await decideRequestUseCase.execute({
      actor,
      requestId,
      decision: parsed.data.decision,
      decisionReason: parsed.data.decisionReason,
    });
    return NextResponse.json({ data: request });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidRequestTransitionError) return conflict(err.message);
    if (err instanceof RequestAlreadyDecidedError) return conflict(err.message);
    throw err;
  }
});
