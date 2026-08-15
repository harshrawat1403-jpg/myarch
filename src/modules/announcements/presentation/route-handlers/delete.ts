import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { deleteAnnouncementUseCase } from "../../infrastructure/container";
import { AnnouncementNotFoundError } from "../../domain/errors";

export const deleteAnnouncementRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const announcementId = await extractRouteParam(routeContext, "id");
  if (!announcementId) return notFound("Announcement not found");

  try {
    await deleteAnnouncementUseCase.execute({ actor, announcementId });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    if (err instanceof AnnouncementNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
