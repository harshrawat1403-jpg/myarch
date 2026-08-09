import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findApplicationBatchId, updateApplicationStatusUseCase } from "../../infrastructure/container";
import {
  ApplicationNotFoundError,
  InvalidApplicationStatusTransitionError,
  PlacementDriveNotFoundError,
} from "../../domain/errors";
import { UpdateApplicationStatusRequestSchema } from "../validation";

export const updateApplicationStatusRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateApplicationStatusRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const application = await updateApplicationStatusUseCase.execute({
        actor,
        applicationId,
        toStatus: parsed.data.toStatus,
        note: parsed.data.note,
      });
      return NextResponse.json({ data: application });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof PlacementDriveNotFoundError) return notFound(err.message);
      if (err instanceof InvalidApplicationStatusTransitionError) return badRequest(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    roles: ["SECRETARY", "COORDINATOR"],
    getRequiredBatchId: async (_req, routeContext) => {
      const applicationId = await extractRouteParam(routeContext, "id");
      return applicationId ? findApplicationBatchId(applicationId) : undefined;
    },
  },
);
