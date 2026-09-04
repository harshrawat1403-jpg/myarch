import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getApplicationUseCase, getMyApplicationUseCase } from "../../infrastructure/container";
import { FormApplicationNotFoundError } from "../../domain/errors";

export const getApplicationRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const applicationId = await extractRouteParam(routeContext, "id");
  if (!applicationId) return notFound("Application not found");
  try {
    const data = actor.role === "STUDENT"
      ? await getMyApplicationUseCase.execute({ actor, applicationId })
      : await getApplicationUseCase.execute({ actor, applicationId });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof FormApplicationNotFoundError) return notFound(error.message);
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    throw error;
  }
});
