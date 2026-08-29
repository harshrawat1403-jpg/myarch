import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { publishDraftContentOverridesUseCase } from "../../infrastructure/container";

export const publishDraftContentOverridesRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const result = await publishDraftContentOverridesUseCase.execute(actor);
      return NextResponse.json({ data: result });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
