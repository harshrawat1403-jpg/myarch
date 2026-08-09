import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { readFile } from "@/lib/file-storage";
import { getCertificateFileUseCase } from "../../infrastructure/container";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";

/** V4.0 D4 — authenticated certificate download, unlike the public /api/files/[fileId] route (certificates are always PRIVATE). */
export const getCertificateRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    try {
      const file = await getCertificateFileUseCase.execute({ actor, applicationId });
      const bytes = await readFile(file.storageKey).catch(() => null);
      if (!bytes) return notFound("Certificate file not found");

      return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
          "Content-Type": file.mimeType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InternshipOutcomeNotFoundError) return notFound("Certificate not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR", "STUDENT"] },
);
