import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getRecruiterStudentProfileUseCase } from "../../infrastructure/container";
import { ApprovedProfileNotFoundError } from "../../domain/errors";

export const getRecruiterProfileRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Profile not found");

    try {
      const profile = await getRecruiterStudentProfileUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: profile });
    } catch (err) {
      if (err instanceof ApprovedProfileNotFoundError) return notFound("Profile not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["RECRUITER"] },
);
