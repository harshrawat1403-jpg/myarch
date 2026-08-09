import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setPlacementDriveStatusUseCase } from "../../infrastructure/container";
import { InvalidDriveStatusTransitionError, PlacementDriveNotFoundError } from "../../domain/errors";
import { SetPlacementDriveStatusRequestSchema } from "../validation";

export const setPlacementDriveStatusRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const driveId = await extractRouteParam(routeContext, "id");
    if (!driveId) return notFound("Placement drive not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SetPlacementDriveStatusRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const drive = await setPlacementDriveStatusUseCase.execute({ actor, driveId, status: parsed.data.status });
      return NextResponse.json({ data: drive });
    } catch (err) {
      if (err instanceof PlacementDriveNotFoundError) return notFound(err.message);
      if (err instanceof InvalidDriveStatusTransitionError) return badRequest(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
