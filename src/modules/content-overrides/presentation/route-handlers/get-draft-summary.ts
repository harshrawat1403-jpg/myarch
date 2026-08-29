import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getDraftSummaryUseCase } from "../../infrastructure/container";

export const getDraftSummaryRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const summary = await getDraftSummaryUseCase.execute(actor);
      return NextResponse.json({ data: summary });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
