import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { archiveCommitteeUseCase } from "../../infrastructure/container";
import { CommitteeNotFoundError } from "../../domain/errors";

export const archiveCommitteeRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  if (!committeeId) return notFound("Committee not found");

  try {
    const committee = await archiveCommitteeUseCase.execute({ actor, committeeId });
    return NextResponse.json({ data: committee });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
