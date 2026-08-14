import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { approveAlumniUseCase, rejectAlumniUseCase } from "../../../infrastructure/container";
import { AlumniNotFoundError, AlumniNotPendingError } from "../../../domain/errors";

export const approveAlumniRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const alumniId = await extractRouteParam(routeContext, "id");
    if (!alumniId) return notFound("Alumni account not found");

    try {
      const alumni = await approveAlumniUseCase.execute({ actor, alumniId });
      return NextResponse.json({ data: alumni });
    } catch (err) {
      if (err instanceof AlumniNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof AlumniNotPendingError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);

export const rejectAlumniRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const alumniId = await extractRouteParam(routeContext, "id");
    if (!alumniId) return notFound("Alumni account not found");

    try {
      const alumni = await rejectAlumniUseCase.execute({ actor, alumniId });
      return NextResponse.json({ data: alumni });
    } catch (err) {
      if (err instanceof AlumniNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof AlumniNotPendingError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
