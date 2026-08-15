import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getMaintenanceCoordinatorUseCase } from "../../infrastructure/container";

/** No `{roles}` gate — see UpdateMaintenanceCoordinatorPermissionsRouteHandler's identical reasoning. */
export const getMaintenanceCoordinatorRouteHandler = withAuth(async (_req, { actor }) => {
  try {
    const coordinator = await getMaintenanceCoordinatorUseCase.execute({ actor });
    return NextResponse.json({ data: coordinator });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
