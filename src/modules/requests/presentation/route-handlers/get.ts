import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getRequestUseCase } from "../../infrastructure/container";
import { RequestNotFoundError } from "../../domain/errors";

export const getRequestRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  try {
    const result = await getRequestUseCase.execute({ actor, requestId });
    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
