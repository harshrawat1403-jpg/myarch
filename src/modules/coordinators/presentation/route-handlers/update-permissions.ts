import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateCoordinatorPermissionsUseCase } from "../../infrastructure/container";
import { CoordinatorNotFoundError, InvalidCoordinatorPermissionError } from "../../domain/errors";
import { UpdateCoordinatorPermissionsRequestSchema } from "../validation";

export const updateCoordinatorPermissionsRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateCoordinatorPermissionsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid permissions data", parsed.error.flatten().fieldErrors);
    }

    try {
      const coordinator = await updateCoordinatorPermissionsUseCase.execute({
        actor,
        coordinatorId,
        permissions: parsed.data.permissions,
      });
      return NextResponse.json({ data: coordinator });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidCoordinatorPermissionError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
