import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { assignBatchUseCase, removeBatchUseCase } from "../../infrastructure/container";
import {
  BatchAlreadyAssignedError,
  BatchNotAssignedError,
  BatchNotFoundError,
  CoordinatorNotFoundError,
} from "../../domain/errors";
import { AssignBatchRequestSchema } from "../validation";

export const assignBatchRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = AssignBatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid batch assignment", parsed.error.flatten().fieldErrors);
    }

    try {
      const coordinator = await assignBatchUseCase.execute({ actor, coordinatorId, batchId: parsed.data.batchId });
      return NextResponse.json({ data: coordinator });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof BatchAlreadyAssignedError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);

export const removeBatchRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    const batchId = req.nextUrl.searchParams.get("batchId");
    if (!batchId) return badRequest("batchId query parameter is required");

    try {
      const coordinator = await removeBatchUseCase.execute({ actor, coordinatorId, batchId });
      return NextResponse.json({ data: coordinator });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof BatchNotAssignedError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
