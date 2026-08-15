import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateAnnouncementUseCase } from "../../infrastructure/container";
import { AnnouncementNotFoundError } from "../../domain/errors";
import { UpdateAnnouncementRequestSchema } from "../validation";

export const updateAnnouncementRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const announcementId = await extractRouteParam(routeContext, "id");
  if (!announcementId) return notFound("Announcement not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateAnnouncementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid announcement data", parsed.error.flatten().fieldErrors);
  }

  try {
    const announcement = await updateAnnouncementUseCase.execute({ actor, announcementId, ...parsed.data });
    return NextResponse.json({ data: announcement });
  } catch (err) {
    if (err instanceof AnnouncementNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
