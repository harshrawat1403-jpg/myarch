import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { submitDraftUseCase } from "../../infrastructure/container";
import { DraftNotFoundError, InvalidDraftTransitionError } from "../../domain/errors";

export const submitDraftRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const draft = await submitDraftUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: draft });
    } catch (err) {
      if (err instanceof DraftNotFoundError) return notFound("No draft exists to submit");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidDraftTransitionError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
