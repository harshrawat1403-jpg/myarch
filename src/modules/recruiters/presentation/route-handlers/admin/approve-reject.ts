import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { approveRecruiterUseCase, rejectRecruiterUseCase } from "../../../infrastructure/container";
import { RecruiterAccountNotFoundError, RecruiterNotPendingError } from "../../../domain/errors";

export const approveRecruiterRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const recruiterId = await extractRouteParam(routeContext, "id");
    if (!recruiterId) return notFound("Recruiter not found");

    try {
      const recruiter = await approveRecruiterUseCase.execute({ actor, recruiterId });
      return NextResponse.json({ data: recruiter });
    } catch (err) {
      if (err instanceof RecruiterAccountNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof RecruiterNotPendingError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);

export const rejectRecruiterRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const recruiterId = await extractRouteParam(routeContext, "id");
    if (!recruiterId) return notFound("Recruiter not found");

    try {
      const recruiter = await rejectRecruiterUseCase.execute({ actor, recruiterId });
      return NextResponse.json({ data: recruiter });
    } catch (err) {
      if (err instanceof RecruiterAccountNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof RecruiterNotPendingError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
