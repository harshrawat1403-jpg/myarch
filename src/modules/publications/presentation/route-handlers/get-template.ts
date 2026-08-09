import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPublicationTemplateUseCase } from "../../infrastructure/container";
import { PublicationTemplateNotFoundError } from "../../domain/errors";

export const getPublicationTemplateRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const templateId = await extractRouteParam(routeContext, "id");
    if (!templateId) return notFound("Publication template not found");

    try {
      const template = await getPublicationTemplateUseCase.execute(actor, templateId);
      return NextResponse.json({ data: template });
    } catch (err) {
      if (err instanceof PublicationTemplateNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
