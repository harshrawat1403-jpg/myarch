import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { StudentNotFoundError } from "@/modules/students";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { getPublishedProfileUseCase } from "../../infrastructure/container";
import { PublishedProfileNotFoundError } from "../../domain/errors";

export const getPublishedProfileRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const profile = await getPublishedProfileUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: profile });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof PublishedProfileNotFoundError) {
        return notFound("No published profile exists for this student yet");
      }
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  // Not RECRUITER — this is the admin/self read path; the future
  // recruiter-facing directory (Days 8–9) is a deliberately separate,
  // not-yet-built endpoint (see get-published-profile use case's doc comment).
  { roles: ["SECRETARY", "COORDINATOR", "STUDENT"] },
);
