import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { resetCoordinatorPasswordUseCase } from "../../infrastructure/container";
import { CoordinatorNotFoundError } from "../../domain/errors";

export const resetCoordinatorPasswordRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    try {
      const result = await resetCoordinatorPasswordUseCase.execute({ actor, coordinatorId });
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
