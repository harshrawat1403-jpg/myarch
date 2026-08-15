import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { removeMeetingParticipantUseCase } from "../../infrastructure/container";
import { MeetingNotFoundError } from "../../domain/errors";

export const removeMeetingParticipantRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const meetingId = await extractRouteParam(routeContext, "id");
  const userId = await extractRouteParam(routeContext, "userId");
  if (!meetingId || !userId) return notFound("Meeting not found");

  try {
    await removeMeetingParticipantUseCase.execute({ actor, meetingId, userId });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    if (err instanceof MeetingNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
