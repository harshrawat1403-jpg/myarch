import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, notFound } from "@/lib/http-errors";
import { updateBatchUseCase } from "../../infrastructure/container";
import { BatchNotFoundError } from "../../domain/errors";
import { UpdateBatchRequestSchema } from "../validation";

export const updateBatchRouteHandler = withAuth(
  async (req: NextRequest, { actor }, routeContext) => {
    const batchId = await extractRouteParam(routeContext, "id");
    if (!batchId) return notFound("Batch not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateBatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid batch data", parsed.error.flatten().fieldErrors);
    }

    try {
      const batch = await updateBatchUseCase.execute({ actor, batchId, ...parsed.data });
      return NextResponse.json({ data: batch });
    } catch (err) {
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
