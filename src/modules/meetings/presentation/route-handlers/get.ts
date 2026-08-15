import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getMeetingUseCase } from "../../infrastructure/container";
import { MeetingNotFoundError } from "../../domain/errors";

export const getMeetingRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const meetingId = await extractRouteParam(routeContext, "id");
  if (!meetingId) return notFound("Meeting not found");

  try {
    const detail = await getMeetingUseCase.execute({ actor, meetingId });
    return NextResponse.json({ data: detail });
  } catch (err) {
    if (err instanceof MeetingNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
