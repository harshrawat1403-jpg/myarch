import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPlacementDriveUseCase } from "../../infrastructure/container";
import { PlacementDriveNotFoundError } from "../../domain/errors";

export const getPlacementDriveRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const driveId = await extractRouteParam(routeContext, "id");
    if (!driveId) return notFound("Placement drive not found");

    try {
      const drive = await getPlacementDriveUseCase.execute({ actor, driveId });
      return NextResponse.json({ data: drive });
    } catch (err) {
      if (err instanceof PlacementDriveNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
