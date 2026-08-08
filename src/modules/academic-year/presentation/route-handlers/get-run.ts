import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getAcademicYearTransitionRunUseCase } from "../../infrastructure/container";
import { AcademicYearTransitionRunNotFoundError } from "../../domain/errors";

export const getAcademicYearTransitionRunRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const runId = await extractRouteParam(routeContext, "runId");
    if (!runId) return notFound("Academic year transition run not found");

    try {
      const run = await getAcademicYearTransitionRunUseCase.execute({ actor, runId });
      return NextResponse.json({ data: run });
    } catch (err) {
      if (err instanceof AcademicYearTransitionRunNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
