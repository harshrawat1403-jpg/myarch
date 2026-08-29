import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateCommitteeUseCase } from "../../infrastructure/container";
import { CommitteeNotFoundError } from "../../domain/errors";
import { UpdateCommitteeRequestSchema } from "../validation";

export const updateCommitteeRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  if (!committeeId) return notFound("Committee not found");

  const body: unknown = await req.json().catch(() => null);
  const parsed = UpdateCommitteeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid committee data", parsed.error.flatten().fieldErrors);
  }

  try {
    const committee = await updateCommitteeUseCase.execute({ actor, committeeId, ...parsed.data });
    return NextResponse.json({ data: committee });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
