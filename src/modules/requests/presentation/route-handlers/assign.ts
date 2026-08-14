import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { assignRequestUseCase } from "../../infrastructure/container";
import { InvalidRequestOwnerError, RequestNotApprovedError, RequestNotFoundError } from "../../domain/errors";
import { AssignRequestRequestSchema } from "../validation";

export const assignRequestRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AssignRequestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid assignment data", parsed.error.flatten().fieldErrors);
  }

  try {
    const request = await assignRequestUseCase.execute({
      actor,
      requestId,
      ownerId: parsed.data.ownerId,
      deadline: parsed.data.deadline,
    });
    return NextResponse.json({ data: request });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidRequestOwnerError) return badRequest(err.message);
    if (err instanceof RequestNotApprovedError) return conflict(err.message);
    throw err;
  }
});
