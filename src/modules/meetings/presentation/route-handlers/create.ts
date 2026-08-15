import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createMeetingUseCase } from "../../infrastructure/container";
import { CreateMeetingRequestSchema } from "../validation";

export const createMeetingRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateMeetingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid meeting data", parsed.error.flatten().fieldErrors);
  }

  try {
    const meeting = await createMeetingUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: meeting }, { status: 201 });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
