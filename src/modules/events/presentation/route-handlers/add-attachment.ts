import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addEventAttachmentUseCase } from "../../infrastructure/container";
import { EventNotFoundError, InvalidEventAttachmentError } from "../../domain/errors";
import { EventAttachmentKindSchema } from "../validation";

export const addEventAttachmentRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const eventId = await extractRouteParam(routeContext, "id");
  if (!eventId) return notFound("Event not found");

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return badRequest("A file field is required");
  }
  const kindParsed = EventAttachmentKindSchema.safeParse(formData?.get("kind"));
  if (!kindParsed.success) {
    return badRequest("A valid `kind` field (DOCUMENT or MEDIA) is required");
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const attachment = await addEventAttachmentUseCase.execute({
      actor,
      eventId,
      data,
      mimeType: file.type,
      sizeBytes: file.size,
      kind: kindParsed.data,
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof EventNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidEventAttachmentError) return badRequest(err.message);
    throw err;
  }
});
