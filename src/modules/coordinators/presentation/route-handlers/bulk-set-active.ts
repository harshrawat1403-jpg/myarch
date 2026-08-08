import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { bulkSetCoordinatorsActiveUseCase } from "../../infrastructure/container";
import { BulkSetActiveRequestSchema } from "../validation";

export const bulkSetCoordinatorsActiveRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = BulkSetActiveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid bulk request", parsed.error.flatten().fieldErrors);
    }

    const result = await bulkSetCoordinatorsActiveUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: result });
  },
  { roles: ["SECRETARY"] },
);
