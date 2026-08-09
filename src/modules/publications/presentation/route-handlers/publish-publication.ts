import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { publishPublicationUseCase } from "../../infrastructure/container";
import { InvalidPublicationContentError, PublicationNotFoundError } from "../../domain/errors";
import { PublishPublicationRequestSchema } from "../validation";

export const publishPublicationRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const publicationId = await extractRouteParam(routeContext, "id");
    if (!publicationId) return notFound("Publication not found");

    const body: unknown = await req.json().catch(() => ({}));
    const parsed = PublishPublicationRequestSchema.safeParse(body ?? {});
    if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten().fieldErrors);

    try {
      const published = await publishPublicationUseCase.execute(actor, publicationId, parsed.data.label);
      return NextResponse.json({ data: published });
    } catch (err) {
      if (err instanceof PublicationNotFoundError) return notFound(err.message);
      if (err instanceof InvalidPublicationContentError) return badRequest(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
