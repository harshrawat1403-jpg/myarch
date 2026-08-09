import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { expressInterestUseCase } from "../../infrastructure/container";
import { ApprovedProfileNotFoundError, RecruiterProfileNotFoundError } from "../../domain/errors";
import { ExpressInterestRequestSchema } from "../validation";

/** One tap, submits immediately, idempotent (§8 step 4 — see ExpressInterestUseCase's own doc comment). Always 200/201 for a repeat attempt, never a conflict error the UI would have to handle specially. */
export const expressInterestRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => ({}));
    const parsed = ExpressInterestRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const interest = await expressInterestUseCase.execute({ actor, studentId, message: parsed.data.message });
      return NextResponse.json({ data: interest });
    } catch (err) {
      if (err instanceof ApprovedProfileNotFoundError) return notFound(err.message);
      if (err instanceof RecruiterProfileNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["RECRUITER"] },
);
