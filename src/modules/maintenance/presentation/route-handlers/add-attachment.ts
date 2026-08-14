import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addMaintenanceAttachmentUseCase } from "../../infrastructure/container";
import { InvalidMaintenanceAttachmentError, MaintenanceIssueNotFoundError } from "../../domain/errors";

export const addMaintenanceAttachmentRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return badRequest("A file field is required");
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const attachment = await addMaintenanceAttachmentUseCase.execute({
      actor,
      issueId,
      data,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidMaintenanceAttachmentError) return badRequest(err.message);
    throw err;
  }
});
