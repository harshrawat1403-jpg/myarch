import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setRecruiterActiveUseCase } from "../../../infrastructure/container";
import {
  RecruiterAccountNotFoundError,
  RecruiterAlreadyActiveError,
  RecruiterAlreadyDisabledError,
} from "../../../domain/errors";

function buildSetActiveHandler(isActive: boolean) {
  return withAuth(
    async (_req, { actor }, routeContext) => {
      const recruiterId = await extractRouteParam(routeContext, "id");
      if (!recruiterId) return notFound("Recruiter not found");

      try {
        const recruiter = await setRecruiterActiveUseCase.execute({ actor, recruiterId, isActive });
        return NextResponse.json({ data: recruiter });
      } catch (err) {
        if (err instanceof RecruiterAccountNotFoundError) return notFound(err.message);
        if (err instanceof NotAuthorizedError) return forbidden(err.message);
        if (err instanceof RecruiterAlreadyActiveError) return conflict(err.message);
        if (err instanceof RecruiterAlreadyDisabledError) return conflict(err.message);
        throw err;
      }
    },
    { roles: ["SECRETARY"] },
  );
}

export const disableRecruiterRouteHandler = buildSetActiveHandler(false);
export const enableRecruiterRouteHandler = buildSetActiveHandler(true);
