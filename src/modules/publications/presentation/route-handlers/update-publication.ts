import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updatePublicationUseCase } from "../../infrastructure/container";
import { PublicationNotFoundError, PublicationVersionConflictError } from "../../domain/errors";
import { UpdatePublicationRequestSchema } from "../validation";

export const updatePublicationRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const publicationId = await extractRouteParam(routeContext, "id");
    if (!publicationId) return notFound("Publication not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdatePublicationRequestSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten().fieldErrors);

    try {
      const updated = await updatePublicationUseCase.execute({
        actor,
        publicationId,
        title: parsed.data.title,
        content: parsed.data.content,
        pageSize: parsed.data.pageSize,
        expectedVersion: parsed.data.expectedVersion,
      });
      return NextResponse.json({ data: updated });
    } catch (err) {
      if (err instanceof PublicationNotFoundError) return notFound(err.message);
      if (err instanceof PublicationVersionConflictError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
