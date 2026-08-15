import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createEventUseCase } from "../../infrastructure/container";
import { CreateEventRequestSchema } from "../validation";

export const createEventRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateEventRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid event data", parsed.error.flatten().fieldErrors);
  }

  try {
    const event = await createEventUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
