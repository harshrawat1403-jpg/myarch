import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getEventUseCase } from "../../infrastructure/container";
import { EventNotFoundError } from "../../domain/errors";

export const getEventRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  try {
    const detail = await getEventUseCase.execute({ actor, eventId });
    return NextResponse.json({ data: detail });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
