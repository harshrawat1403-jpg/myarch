import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { markEventAttendanceUseCase } from "../../infrastructure/container";
import { EventNotFoundError, NotRegisteredForEventError } from "../../domain/errors";
import { MarkEventAttendanceRequestSchema } from "../validation";

export const markEventAttendanceRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = MarkEventAttendanceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid attendance data", parsed.error.flatten().fieldErrors);
  }

  try {
    const registration = await markEventAttendanceUseCase.execute({ actor, eventId, userId: parsed.data.userId });
    return NextResponse.json({ data: registration });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof NotRegisteredForEventError) return badRequest(err.message);
    throw err;
  }
});
