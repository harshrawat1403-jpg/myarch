import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { endCommitteeMembershipUseCase } from "../../infrastructure/container";
import { CommitteeMembershipNotFoundError, CommitteeNotFoundError } from "../../domain/errors";

/** DELETE here is a soft close (isActive: false, endDate: now()), not a row deletion — see EndCommitteeMembershipUseCase's own doc comment. */
export const endCommitteeMembershipRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  const membershipId = await extractRouteParam(routeContext, "membershipId");
  if (!committeeId || !membershipId) return notFound("Committee membership not found");

  try {
    const membership = await endCommitteeMembershipUseCase.execute({ actor, committeeId, membershipId });
    return NextResponse.json({ data: membership });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError || err instanceof CommitteeMembershipNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
