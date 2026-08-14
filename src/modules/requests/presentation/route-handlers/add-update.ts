import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addRequestUpdateUseCase } from "../../infrastructure/container";
import { RequestNotFoundError } from "../../domain/errors";
import { AddRequestUpdateRequestSchema } from "../validation";

export const addRequestUpdateRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddRequestUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid update data", parsed.error.flatten().fieldErrors);
  }

  try {
    const comment = await addRequestUpdateUseCase.execute({ actor, requestId, body: parsed.data.body });
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
