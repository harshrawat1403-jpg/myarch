import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { bulkSetRecruitersActiveUseCase } from "../../../infrastructure/container";
import { BulkSetRecruitersActiveRequestSchema } from "../../validation";

export const bulkSetRecruitersActiveRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = BulkSetRecruitersActiveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid bulk request", parsed.error.flatten().fieldErrors);
    }

    const result = await bulkSetRecruitersActiveUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: result });
  },
  { roles: ["SECRETARY"] },
);
