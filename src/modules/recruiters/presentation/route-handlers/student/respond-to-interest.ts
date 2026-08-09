import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { respondToInterestUseCase } from "../../../infrastructure/container";
import { InterestRequestAlreadyRespondedError, InterestRequestNotFoundError } from "../../../domain/errors";
import { RespondToInterestRequestSchema } from "../../validation";

/** V4.0 C3 — PATCH /api/student/interests/[id], accept or decline (§7 step 7). */
export const respondToInterestRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const interestId = await extractRouteParam(routeContext, "id");
    if (!interestId) return notFound("Interest request not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = RespondToInterestRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const updated = await respondToInterestUseCase.execute({
        actor,
        interestId,
        decision: parsed.data.decision,
      });
      return NextResponse.json({ data: updated });
    } catch (err) {
      if (err instanceof InterestRequestNotFoundError) return notFound(err.message);
      if (err instanceof InterestRequestAlreadyRespondedError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
