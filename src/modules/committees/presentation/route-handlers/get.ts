import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getCommitteeUseCase } from "../../infrastructure/container";
import { CommitteeNotFoundError } from "../../domain/errors";

export const getCommitteeRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  if (!committeeId) return notFound("Committee not found");

  try {
    const detail = await getCommitteeUseCase.execute({ actor, committeeId });
    return NextResponse.json({ data: detail });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
