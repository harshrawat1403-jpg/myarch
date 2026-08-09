import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getInternshipOutcomeUseCase } from "../../infrastructure/container";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";

export const getInternshipOutcomeRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    try {
      const outcome = await getInternshipOutcomeUseCase.execute({ actor, applicationId });
      return NextResponse.json({ data: outcome });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InternshipOutcomeNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR", "STUDENT"] },
);
