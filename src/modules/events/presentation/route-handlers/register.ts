import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { registerForEventUseCase } from "../../infrastructure/container";
import { AlreadyRegisteredForEventError, EventNotFoundError, EventNotRegistrableError } from "../../domain/errors";

export const registerForEventRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  try {
    const registration = await registerForEventUseCase.execute({ actor, eventId });
    return NextResponse.json({ data: registration }, { status: 201 });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof EventNotRegistrableError || err instanceof AlreadyRegisteredForEventError) {
      return badRequest(err.message);
    }
    throw err;
  }
});
