import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { assignReviewerUseCase } from "../../infrastructure/container";
import { ApplicationAlreadyDecidedError, FormApplicationNotFoundError, ReviewerAlreadyAssignedError, ReviewerNotFoundError } from "../../domain/errors";
import { AssignReviewerRequestSchema } from "../validation";

export const assignReviewerRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const applicationId = await extractRouteParam(routeContext, "id");
  if (!applicationId) return notFound("Application not found");
  const parsed = AssignReviewerRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid reviewer data", parsed.error.flatten().fieldErrors);
  try {
    return NextResponse.json({ data: await assignReviewerUseCase.execute({ actor, applicationId, ...parsed.data }) }, { status: 201 });
  } catch (error) {
    if (error instanceof NotAuthorizedError) return forbidden(error.message);
    if (error instanceof FormApplicationNotFoundError || error instanceof ReviewerNotFoundError) return notFound(error.message);
    if (error instanceof ReviewerAlreadyAssignedError || error instanceof ApplicationAlreadyDecidedError) return conflict(error.message);
    throw error;
  }
});
