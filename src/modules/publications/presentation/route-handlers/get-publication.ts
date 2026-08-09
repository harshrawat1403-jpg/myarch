import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPublicationUseCase } from "../../infrastructure/container";
import { PublicationNotFoundError } from "../../domain/errors";

export const getPublicationRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const publicationId = await extractRouteParam(routeContext, "id");
    if (!publicationId) return notFound("Publication not found");

    try {
      const publication = await getPublicationUseCase.execute(actor, publicationId);
      return NextResponse.json({ data: publication });
    } catch (err) {
      if (err instanceof PublicationNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
