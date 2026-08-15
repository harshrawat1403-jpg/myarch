import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { removeEventParticipantUseCase } from "../../infrastructure/container";
import { EventNotFoundError } from "../../domain/errors";

export const removeEventParticipantRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  const userId = await extractRouteParam(routeContext, "userId");
  if (!eventId || !userId) return notFound("Event not found");

  try {
    await removeEventParticipantUseCase.execute({ actor, eventId, userId });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
