import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { createBatchUseCase } from "../../infrastructure/container";
import { CreateBatchRequestSchema } from "../validation";

export const createBatchRouteHandler = withAuth(
  async (req: NextRequest, { actor }) => {
    const body: unknown = await req.json().catch(() => null);
    const parsed = CreateBatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid batch data", parsed.error.flatten().fieldErrors);
    }

    try {
      const batch = await createBatchUseCase.execute({ actor, ...parsed.data });
      return NextResponse.json({ data: batch }, { status: 201 });
    } catch (err) {
      // Defense in depth: the route is already role-gated to SECRETARY, so
      // this is currently unreachable, but every use case's own
      // authorization check must still degrade to a clean 403 rather than
      // an unhandled 500 if it's ever called from a less-restrictive route.
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
