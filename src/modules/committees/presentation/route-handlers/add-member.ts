import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { addCommitteeMemberUseCase } from "../../infrastructure/container";
import { CommitteeNotFoundError, DuplicateCommitteeMembershipError } from "../../domain/errors";
import { AddCommitteeMemberRequestSchema } from "../validation";

export const addCommitteeMemberRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  if (!committeeId) return notFound("Committee not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = AddCommitteeMemberRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid member data", parsed.error.flatten().fieldErrors);
  }

  try {
    const membership = await addCommitteeMemberUseCase.execute({ actor, committeeId, ...parsed.data });
    return NextResponse.json({ data: membership }, { status: 201 });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    if (err instanceof DuplicateCommitteeMembershipError) return badRequest(err.message);
    throw err;
  }
});
