import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getBulkImportRunUseCase } from "../../infrastructure/container";
import { BulkImportRunNotFoundError } from "../../domain/errors";

export const getBulkImportRunRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const runId = await extractRouteParam(routeContext, "runId");
    if (!runId) return notFound("Bulk import run not found");

    try {
      const run = await getBulkImportRunUseCase.execute({ actor, bulkImportRunId: runId });
      return NextResponse.json({ data: run });
    } catch (err) {
      if (err instanceof BulkImportRunNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
