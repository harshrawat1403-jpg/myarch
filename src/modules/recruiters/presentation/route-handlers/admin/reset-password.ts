import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { resetRecruiterPasswordUseCase } from "../../../infrastructure/container";
import { RecruiterAccountNotFoundError } from "../../../domain/errors";

export const resetRecruiterPasswordRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const recruiterId = await extractRouteParam(routeContext, "id");
    if (!recruiterId) return notFound("Recruiter not found");

    try {
      const result = await resetRecruiterPasswordUseCase.execute({ actor, recruiterId });
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof RecruiterAccountNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
