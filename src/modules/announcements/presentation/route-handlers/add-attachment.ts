import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addAnnouncementAttachmentUseCase } from "../../infrastructure/container";
import { AnnouncementNotFoundError, InvalidAnnouncementAttachmentError } from "../../domain/errors";

export const addAnnouncementAttachmentRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const announcementId = await extractRouteParam(routeContext, "id");
  if (!announcementId) return notFound("Announcement not found");

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return badRequest("A file field is required");
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const attachment = await addAnnouncementAttachmentUseCase.execute({
      actor,
      announcementId,
      data,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof AnnouncementNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidAnnouncementAttachmentError) return badRequest(err.message);
    throw err;
  }
});
