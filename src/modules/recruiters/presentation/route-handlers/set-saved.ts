import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setSavedStudentUseCase } from "../../infrastructure/container";
import { ApprovedProfileNotFoundError, RecruiterProfileNotFoundError } from "../../domain/errors";
import { SetSavedStudentRequestSchema } from "../validation";

export const setSavedStudentRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SetSavedStudentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const interaction = await setSavedStudentUseCase.execute({ actor, studentId, saved: parsed.data.saved });
      return NextResponse.json({ data: interaction });
    } catch (err) {
      if (err instanceof ApprovedProfileNotFoundError) return notFound(err.message);
      if (err instanceof RecruiterProfileNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["RECRUITER"] },
);
