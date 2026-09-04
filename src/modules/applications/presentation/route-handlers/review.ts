import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { recordReviewUseCase } from "../../infrastructure/container";
import { FormApplicationNotFoundError, InvalidFormApplicationTransitionError, ReviewerNotAssignedError } from "../../domain/errors";
import { ReviewRequestSchema } from "../validation";

export const recordReviewRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const applicationId = await extractRouteParam(routeContext, "id");
  if (!applicationId) return notFound("Application not found");
  const parsed = ReviewRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid review data", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await recordReviewUseCase.execute({ actor, applicationId, ...parsed.data }) }, { status: 201 });
  } catch (error) {
    if (error instanceof NotAuthorizedError || error instanceof ReviewerNotAssignedError) return forbidden(error.message);
    if (error instanceof InvalidFormApplicationTransitionError) return conflict(error.message);
    if (error instanceof FormApplicationNotFoundError) return notFound(error.message);
    throw error;
  }
});
