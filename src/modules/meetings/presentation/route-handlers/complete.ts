import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { completeMeetingUseCase } from "../../infrastructure/container";
import { InvalidMeetingTransitionError, MeetingNotFoundError } from "../../domain/errors";

export const completeMeetingRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const meetingId = await extractRouteParam(routeContext, "id");
  if (!meetingId) return notFound("Meeting not found");

  try {
    const meeting = await completeMeetingUseCase.execute({ actor, meetingId });
    return NextResponse.json({ data: meeting });
  } catch (err) {
    if (err instanceof MeetingNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidMeetingTransitionError) return badRequest(err.message);
    throw err;
  }
});
