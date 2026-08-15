import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { markMeetingAttendanceUseCase } from "../../infrastructure/container";
import { MeetingNotFoundError } from "../../domain/errors";
import { MarkMeetingAttendanceRequestSchema } from "../validation";

export const markMeetingAttendanceRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const meetingId = await extractRouteParam(routeContext, "id");
  if (!meetingId) return notFound("Meeting not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = MarkMeetingAttendanceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid attendance data", parsed.error.flatten().fieldErrors);
  }

  try {
    const participant = await markMeetingAttendanceUseCase.execute({ actor, meetingId, ...parsed.data });
    return NextResponse.json({ data: participant });
  } catch (err) {
    if (err instanceof MeetingNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
