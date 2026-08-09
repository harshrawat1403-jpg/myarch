import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateAlumniUseCase } from "../../infrastructure/container";
import { AlumniNotFoundError, DuplicateAlumniLinkError, StudentProfileNotFoundError } from "../../domain/errors";
import { UpdateAlumniRequestSchema } from "../validation";

export const updateAlumniRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const alumniId = await extractRouteParam(routeContext, "id");
    if (!alumniId) return notFound("Alumni record not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateAlumniRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid alumni data", parsed.error.flatten().fieldErrors);
    }

    try {
      const alumni = await updateAlumniUseCase.execute({ actor, alumniId, ...parsed.data });
      return NextResponse.json({ data: alumni });
    } catch (err) {
      if (err instanceof AlumniNotFoundError) return notFound(err.message);
      if (err instanceof StudentProfileNotFoundError) return notFound(err.message);
      if (err instanceof DuplicateAlumniLinkError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
