import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setCoordinatorMaintenanceRoleUseCase } from "../../infrastructure/container";
import { CoordinatorNotFoundError, InactiveCoordinatorError, MaxActiveMaintenanceRoleError } from "../../domain/errors";
import { SetCoordinatorMaintenanceRoleRequestSchema } from "../validation";

export const setCoordinatorMaintenanceRoleRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SetCoordinatorMaintenanceRoleRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid maintenance role", parsed.error.flatten().fieldErrors);
    }

    try {
      const coordinator = await setCoordinatorMaintenanceRoleUseCase.execute({
        actor,
        coordinatorId,
        maintenanceRole: parsed.data.maintenanceRole,
      });
      return NextResponse.json({ data: coordinator });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InactiveCoordinatorError || err instanceof MaxActiveMaintenanceRoleError) {
        return badRequest(err.message);
      }
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
