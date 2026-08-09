import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { requestPublicationExportUseCase } from "../../infrastructure/container";
import { PublicationNotFoundError } from "../../domain/errors";
import { RequestExportRequestSchema } from "../validation";

export const requestPublicationExportRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const publicationId = await extractRouteParam(routeContext, "id");
    if (!publicationId) return notFound("Publication not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = RequestExportRequestSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten().fieldErrors);

    try {
      const exportRecord = await requestPublicationExportUseCase.execute(actor, publicationId, parsed.data.format);
      return NextResponse.json({ data: exportRecord }, { status: 202 });
    } catch (err) {
      if (err instanceof PublicationNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
