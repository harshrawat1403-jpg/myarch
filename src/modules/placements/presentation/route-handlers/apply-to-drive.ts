import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { applyToPlacementDriveUseCase } from "../../infrastructure/container";
import { AlreadyAppliedError, DriveNotOpenError, NotEligibleForDriveError, PlacementDriveNotFoundError } from "../../domain/errors";

/** V4.0 D1 — POST /api/student/drives/[id]/apply (§7 step 8). Not idempotent — a second attempt is a real 409, unlike Express Interest. */
export const applyToPlacementDriveRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const driveId = await extractRouteParam(routeContext, "id");
    if (!driveId) return notFound("Placement drive not found");

    try {
      const application = await applyToPlacementDriveUseCase.execute({ actor, driveId });
      return NextResponse.json({ data: application }, { status: 201 });
    } catch (err) {
      if (err instanceof PlacementDriveNotFoundError) return notFound(err.message);
      if (err instanceof DriveNotOpenError) return conflict(err.message);
      if (err instanceof NotEligibleForDriveError) return forbidden(err.message);
      if (err instanceof AlreadyAppliedError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
