import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addMeetingParticipantUseCase } from "../../infrastructure/container";
import { DuplicateMeetingParticipantError, MeetingNotFoundError } from "../../domain/errors";
import { AddMeetingParticipantRequestSchema } from "../validation";

export const addMeetingParticipantRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const meetingId = await extractRouteParam(routeContext, "id");
  if (!meetingId) return notFound("Meeting not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddMeetingParticipantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid participant data", parsed.error.flatten().fieldErrors);
  }

  try {
    const participant = await addMeetingParticipantUseCase.execute({ actor, meetingId, userId: parsed.data.userId });
    return NextResponse.json({ data: participant }, { status: 201 });
  } catch (err) {
    if (err instanceof MeetingNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof DuplicateMeetingParticipantError) return badRequest(err.message);
    throw err;
  }
});
