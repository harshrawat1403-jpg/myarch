import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { bulkSetStudentsActiveUseCase } from "../../infrastructure/container";
import { BulkSetStudentsActiveRequestSchema } from "../validation";

export const bulkSetStudentsActiveRouteHandler = withAuth(
  async (req, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = BulkSetStudentsActiveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid bulk request", parsed.error.flatten().fieldErrors);
    }

    const result = await bulkSetStudentsActiveUseCase.execute({ actor, ...parsed.data });
    return NextResponse.json({ data: result });
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
