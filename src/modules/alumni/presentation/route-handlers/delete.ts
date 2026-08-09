import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { deleteAlumniUseCase } from "../../infrastructure/container";
import { AlumniNotFoundError } from "../../domain/errors";

export const deleteAlumniRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const alumniId = await extractRouteParam(routeContext, "id");
    if (!alumniId) return notFound("Alumni record not found");

    try {
      await deleteAlumniUseCase.execute({ actor, alumniId });
      return NextResponse.json({ data: { id: alumniId } });
    } catch (err) {
      if (err instanceof AlumniNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
