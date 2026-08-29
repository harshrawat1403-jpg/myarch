import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { extractRouteParam } from "@/lib/route-params";
import { removeContentOverrideUseCase } from "../../infrastructure/container";

export const removeContentOverrideRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const page = await extractRouteParam(routeContext, "page");
    const contentKey = await extractRouteParam(routeContext, "contentKey");
    if (!page || !contentKey) return badRequest("Missing page or content key");

    try {
      await removeContentOverrideUseCase.execute(actor, page, contentKey);
      return NextResponse.json({ data: { removed: true } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
