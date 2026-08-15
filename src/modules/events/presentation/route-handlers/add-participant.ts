import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addEventParticipantUseCase } from "../../infrastructure/container";
import { DuplicateEventParticipantError, EventNotFoundError } from "../../domain/errors";
import { AddEventParticipantRequestSchema } from "../validation";

export const addEventParticipantRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddEventParticipantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid participant data", parsed.error.flatten().fieldErrors);
  }

  try {
    const participant = await addEventParticipantUseCase.execute({ actor, eventId, ...parsed.data });
    return NextResponse.json({ data: participant }, { status: 201 });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof DuplicateEventParticipantError) return badRequest(err.message);
    throw err;
  }
});
