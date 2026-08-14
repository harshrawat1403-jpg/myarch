import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addRequestAttachmentUseCase } from "../../infrastructure/container";
import { InvalidRequestAttachmentError, RequestNotFoundError } from "../../domain/errors";

export const addRequestAttachmentRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return badRequest("A file field is required");
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const attachment = await addRequestAttachmentUseCase.execute({
      actor,
      requestId,
      data,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidRequestAttachmentError) return badRequest(err.message);
    throw err;
  }
});
