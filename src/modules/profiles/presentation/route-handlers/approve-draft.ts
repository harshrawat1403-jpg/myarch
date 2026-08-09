import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { StudentNotFoundError } from "@/modules/students";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { approveDraftUseCase } from "../../infrastructure/container";
import { DraftNotFoundError, InvalidDraftTransitionError } from "../../domain/errors";

// V4.0 (Q1): final profile-draft approval is Secretary-only — narrowed from
// ["SECRETARY", "COORDINATOR"], matching canApprovePublicProfile. No
// getRequiredBatchId here since Secretary is unscoped by design and is now
// the only role that can ever reach this handler.
export const approveDraftRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const published = await approveDraftUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: published });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof DraftNotFoundError) return notFound("No draft exists to approve");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidDraftTransitionError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
