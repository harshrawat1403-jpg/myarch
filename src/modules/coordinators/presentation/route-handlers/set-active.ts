import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setCoordinatorActiveUseCase } from "../../infrastructure/container";
import {
  CoordinatorAlreadyActiveError,
  CoordinatorAlreadyDisabledError,
  CoordinatorNotFoundError,
} from "../../domain/errors";

function buildSetActiveHandler(isActive: boolean) {
  return withAuth(
    async (_req, { actor }, routeContext) => {
      const coordinatorId = await extractRouteParam(routeContext, "id");
      if (!coordinatorId) return notFound("Coordinator not found");

      try {
        const coordinator = await setCoordinatorActiveUseCase.execute({ actor, coordinatorId, isActive });
        return NextResponse.json({ data: coordinator });
      } catch (err) {
        if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
        if (err instanceof NotAuthorizedError) return forbidden(err.message);
        if (err instanceof CoordinatorAlreadyActiveError) return conflict(err.message);
        if (err instanceof CoordinatorAlreadyDisabledError) return conflict(err.message);
        throw err;
      }
    },
    { roles: ["SECRETARY"] },
  );
}

export const disableCoordinatorRouteHandler = buildSetActiveHandler(false);
export const enableCoordinatorRouteHandler = buildSetActiveHandler(true);
