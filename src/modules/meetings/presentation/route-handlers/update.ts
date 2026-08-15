import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateMeetingUseCase } from "../../infrastructure/container";
import { MeetingNotFoundError } from "../../domain/errors";
import { UpdateMeetingRequestSchema } from "../validation";

export const updateMeetingRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const meetingId = await extractRouteParam(routeContext, "id");
  if (!meetingId) return notFound("Meeting not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateMeetingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid meeting data", parsed.error.flatten().fieldErrors);
  }

  try {
    const meeting = await updateMeetingUseCase.execute({ actor, meetingId, ...parsed.data });
    return NextResponse.json({ data: meeting });
  } catch (err) {
    if (err instanceof MeetingNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
