import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { withdrawApplicationUseCase } from "../../infrastructure/container";
import { ApplicationNotFoundError, InvalidApplicationStatusTransitionError } from "../../domain/errors";

export const withdrawApplicationRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    try {
      const application = await withdrawApplicationUseCase.execute({ actor, applicationId });
      return NextResponse.json({ data: application });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InvalidApplicationStatusTransitionError) return badRequest(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
