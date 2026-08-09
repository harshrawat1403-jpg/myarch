import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { readFile } from "@/lib/file-storage";
import { getPublicationExportFileUseCase } from "../../infrastructure/container";
import { PublicationExportNotFoundError } from "../../domain/errors";

/** V4.0 E5 — authenticated export download; PublicationExport files are always PRIVATE, never served through the public /api/files/[fileId] route. */
export const downloadPublicationExportRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const exportId = await extractRouteParam(routeContext, "exportId");
    if (!exportId) return notFound("Export not found");

    try {
      const file = await getPublicationExportFileUseCase.execute(actor, exportId);
      const bytes = await readFile(file.storageKey).catch(() => null);
      if (!bytes) return notFound("Export file not found");

      return new NextResponse(bytes as unknown as BodyInit, {
        headers: { "Content-Type": file.mimeType, "Cache-Control": "private, max-age=3600" },
      });
    } catch (err) {
      if (err instanceof PublicationExportNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
