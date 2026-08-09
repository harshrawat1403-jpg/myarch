import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { restorePublicationVersionUseCase } from "../../infrastructure/container";
import { PublicationNotFoundError, PublicationVersionConflictError, PublicationVersionNotFoundError } from "../../domain/errors";

export const restorePublicationVersionRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const publicationId = await extractRouteParam(routeContext, "id");
    const versionNumberParam = await extractRouteParam(routeContext, "versionNumber");
    if (!publicationId) return notFound("Publication not found");
    const versionNumber = Number(versionNumberParam);
    if (!versionNumberParam || !Number.isInteger(versionNumber)) return badRequest("Invalid version number");

    try {
      const restored = await restorePublicationVersionUseCase.execute(actor, publicationId, versionNumber);
      return NextResponse.json({ data: restored });
    } catch (err) {
      if (err instanceof PublicationNotFoundError || err instanceof PublicationVersionNotFoundError) return notFound(err.message);
      if (err instanceof PublicationVersionConflictError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
