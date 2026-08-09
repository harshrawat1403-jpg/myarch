import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findApplicationBatchId, uploadInternshipCertificateUseCase } from "../../infrastructure/container";
import {
  ApplicationNotFoundError,
  InternshipOutcomeNotFoundError,
  InvalidCertificateFileError,
} from "../../domain/errors";

export const uploadCertificateRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return badRequest("A file field is required");
    }

    const data = Buffer.from(await file.arrayBuffer());

    try {
      const outcome = await uploadInternshipCertificateUseCase.execute({
        actor,
        applicationId,
        data,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      return NextResponse.json({ data: outcome });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InternshipOutcomeNotFoundError) return notFound(err.message);
      if (err instanceof InvalidCertificateFileError) return badRequest(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    roles: ["SECRETARY", "COORDINATOR"],
    getRequiredBatchId: async (_req, routeContext) => {
      const applicationId = await extractRouteParam(routeContext, "id");
      return applicationId ? findApplicationBatchId(applicationId) : undefined;
    },
  },
);
