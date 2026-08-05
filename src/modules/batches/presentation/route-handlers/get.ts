import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { getBatchUseCase } from "../../infrastructure/container";
import { BatchNotFoundError } from "../../domain/errors";
import { NotAuthorizedError } from "@/lib/errors";
import { forbidden } from "@/lib/http-errors";

export const getBatchRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const batchId = await extractRouteParam(routeContext, "id");
    if (!batchId) return notFound("Batch not found");

    try {
      const batch = await getBatchUseCase.execute({ actor, batchId });
      return NextResponse.json({ data: batch });
    } catch (err) {
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    roles: ["SECRETARY", "COORDINATOR"],
    getRequiredBatchId: (_req, routeContext) => extractRouteParam(routeContext, "id"),
  },
);
