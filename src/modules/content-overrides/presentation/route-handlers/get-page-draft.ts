import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { extractRouteParam } from "@/lib/route-params";
import { getPageDraftContentOverridesUseCase } from "../../infrastructure/container";

export const getPageDraftContentOverridesRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const page = await extractRouteParam(routeContext, "page");
    if (!page) return badRequest("Missing page");

    try {
      const draft = await getPageDraftContentOverridesUseCase.execute(actor, page);
      return NextResponse.json({ data: draft });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
