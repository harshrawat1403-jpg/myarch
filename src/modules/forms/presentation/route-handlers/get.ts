import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getFormUseCase } from "../../infrastructure/container";
import { FormNotFoundError } from "../../domain/errors";

export const getFormRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const formId = await extractRouteParam(routeContext, "id");
  if (!formId) return notFound("Form not found");
  try {
    return NextResponse.json({ data: await getFormUseCase.execute({ actor, formId, availableOnly: actor.role === "STUDENT" }) });
  } catch (error) {
    if (error instanceof FormNotFoundError) return notFound(error.message);
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    throw error;
  }
});
