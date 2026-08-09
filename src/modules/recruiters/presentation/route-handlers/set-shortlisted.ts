import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { setShortlistedStudentUseCase } from "../../infrastructure/container";
import { RecruiterProfileNotFoundError, StudentNotSavedError } from "../../domain/errors";
import { SetShortlistedStudentRequestSchema } from "../validation";

export const setShortlistedStudentRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SetShortlistedStudentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const interaction = await setShortlistedStudentUseCase.execute({
        actor,
        studentId,
        isShortlisted: parsed.data.isShortlisted,
      });
      return NextResponse.json({ data: interaction });
    } catch (err) {
      if (err instanceof RecruiterProfileNotFoundError) return notFound(err.message);
      if (err instanceof StudentNotSavedError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["RECRUITER"] },
);
