import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { cancelEventUseCase } from "../../infrastructure/container";
import { EventNotFoundError, InvalidEventTransitionError } from "../../domain/errors";

export const cancelEventRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  try {
    const event = await cancelEventUseCase.execute({ actor, eventId });
    return NextResponse.json({ data: event });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidEventTransitionError) return badRequest(err.message);
    throw err;
  }
});
