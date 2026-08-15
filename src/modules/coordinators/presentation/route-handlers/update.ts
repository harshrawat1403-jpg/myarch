import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateCoordinatorUseCase } from "../../infrastructure/container";
import { CoordinatorNotFoundError, InvalidCustomPositionError } from "../../domain/errors";
import { UpdateCoordinatorRequestSchema } from "../validation";

export const updateCoordinatorRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateCoordinatorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid coordinator data", parsed.error.flatten().fieldErrors);
    }

    try {
      const coordinator = await updateCoordinatorUseCase.execute({ actor, coordinatorId, ...parsed.data });
      return NextResponse.json({ data: coordinator });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidCustomPositionError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
