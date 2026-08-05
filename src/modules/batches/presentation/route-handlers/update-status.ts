import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, notFound } from "@/lib/http-errors";
import { updateBatchStatusUseCase } from "../../infrastructure/container";
import { BatchNotFoundError } from "../../domain/errors";
import { UpdateBatchStatusRequestSchema } from "../validation";

export const updateBatchStatusRouteHandler = withAuth(
  async (req: NextRequest, { actor }, routeContext) => {
    const batchId = await extractRouteParam(routeContext, "id");
    if (!batchId) return notFound("Batch not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateBatchStatusRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid status", parsed.error.flatten().fieldErrors);
    }

    try {
      const batch = await updateBatchStatusUseCase.execute({
        actor,
        batchId,
        status: parsed.data.status,
      });
      return NextResponse.json({ data: batch });
    } catch (err) {
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
