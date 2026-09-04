import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { decideApplicationUseCase } from "../../infrastructure/container";
import { ApplicationAlreadyDecidedError, FormApplicationNotFoundError, InvalidFormApplicationTransitionError } from "../../domain/errors";
import { DecisionRequestSchema } from "../validation";

export const decideApplicationRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const applicationId = await extractRouteParam(routeContext, "id");
  if (!applicationId) return notFound("Application not found");
  const parsed = DecisionRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid decision data", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await decideApplicationUseCase.execute({ actor, applicationId, status: parsed.data.status, reason: parsed.data.reason ?? undefined }) });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    if (error instanceof FormApplicationNotFoundError) return notFound(error.message);
    if (error instanceof ApplicationAlreadyDecidedError || error instanceof InvalidFormApplicationTransitionError) return conflict(error.message);
    throw error;
  }
});
