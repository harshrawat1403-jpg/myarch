import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateCommitteeMemberUseCase } from "../../infrastructure/container";
import { CommitteeMembershipNotFoundError, CommitteeNotFoundError } from "../../domain/errors";
import { UpdateCommitteeMemberRequestSchema } from "../validation";

export const updateCommitteeMemberRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  const membershipId = await extractRouteParam(routeContext, "membershipId");
  if (!committeeId || !membershipId) return notFound("Committee membership not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateCommitteeMemberRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid member data", parsed.error.flatten().fieldErrors);
  }

  try {
    const membership = await updateCommitteeMemberUseCase.execute({ actor, committeeId, membershipId, ...parsed.data });
    return NextResponse.json({ data: membership });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError || err instanceof CommitteeMembershipNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
