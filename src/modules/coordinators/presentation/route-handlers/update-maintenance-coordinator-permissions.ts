import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateMaintenanceCoordinatorPermissionsUseCase } from "../../infrastructure/container";
import { InvalidCoordinatorPermissionError, NoMaintenanceCoordinatorDesignatedError } from "../../domain/errors";
import { UpdateMaintenanceCoordinatorPermissionsRequestSchema } from "../validation";

/** No `{roles}` gate — SECRETARY and a MAINTENANCE_SECRETARY-flagged COORDINATOR must both pass; the use case's own internal check is the real authorization boundary, same pattern as every Maintenance route handler. */
export const updateMaintenanceCoordinatorPermissionsRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateMaintenanceCoordinatorPermissionsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid permissions data", parsed.error.flatten().fieldErrors);
  }

  try {
    const coordinator = await updateMaintenanceCoordinatorPermissionsUseCase.execute({
      actor,
      permissions: parsed.data.permissions,
    });
    return NextResponse.json({ data: coordinator });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof InvalidCoordinatorPermissionError) return badRequest(err.message);
    if (err instanceof NoMaintenanceCoordinatorDesignatedError) return badRequest(err.message);
    throw err;
  }
});
