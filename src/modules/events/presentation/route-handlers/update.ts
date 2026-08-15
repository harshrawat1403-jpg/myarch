import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateEventUseCase } from "../../infrastructure/container";
import { EventNotFoundError } from "../../domain/errors";
import { UpdateEventRequestSchema } from "../validation";

export const updateEventRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateEventRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid event data", parsed.error.flatten().fieldErrors);
  }

  try {
    const event = await updateEventUseCase.execute({ actor, eventId, ...parsed.data });
    return NextResponse.json({ data: event });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
