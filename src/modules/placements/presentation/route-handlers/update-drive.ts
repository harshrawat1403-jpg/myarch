import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updatePlacementDriveUseCase } from "../../infrastructure/container";
import { PlacementDriveNotFoundError } from "../../domain/errors";
import { UpdatePlacementDriveRequestSchema } from "../validation";

export const updatePlacementDriveRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const driveId = await extractRouteParam(routeContext, "id");
    if (!driveId) return notFound("Placement drive not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdatePlacementDriveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const drive = await updatePlacementDriveUseCase.execute({ actor, driveId, data: parsed.data });
      return NextResponse.json({ data: drive });
    } catch (err) {
      if (err instanceof PlacementDriveNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
