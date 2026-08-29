import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addCommitteeAttachmentUseCase } from "../../infrastructure/container";
import { CommitteeNotFoundError, InvalidCommitteeAttachmentError } from "../../domain/errors";

export const addCommitteeAttachmentRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  if (!committeeId) return notFound("Committee not found");

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return badRequest("A file field is required");
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const attachment = await addCommitteeAttachmentUseCase.execute({
      actor,
      committeeId,
      data,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidCommitteeAttachmentError) return badRequest(err.message);
    throw err;
  }
});
