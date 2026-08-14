import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { startRequestReviewUseCase } from "../../infrastructure/container";
import { InvalidRequestTransitionError, RequestNotFoundError } from "../../domain/errors";

export const startRequestReviewRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  try {
    const request = await startRequestReviewUseCase.execute({ actor, requestId });
    return NextResponse.json({ data: request });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidRequestTransitionError) return conflict(err.message);
    throw err;
  }
});
