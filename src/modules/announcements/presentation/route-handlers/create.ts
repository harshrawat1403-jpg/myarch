import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createAnnouncementUseCase } from "../../infrastructure/container";
import { CreateAnnouncementRequestSchema } from "../validation";

export const createAnnouncementRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateAnnouncementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid announcement data", parsed.error.flatten().fieldErrors);
  }

  try {
    const announcement = await createAnnouncementUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: announcement }, { status: 201 });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
