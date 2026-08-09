import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { StudentNotFoundError } from "@/modules/students";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { updateProfileVisibilityUseCase } from "../../infrastructure/container";
import { PublishedProfileNotFoundError } from "../../domain/errors";
import { UpdateProfileVisibilityRequestSchema } from "../validation";

/** Student-only, own profile only (see UpdateProfileVisibilityUseCase's doc comment — deliberately narrower than the STUDENT/COORDINATOR/SECRETARY read path above). */
export const updateProfileVisibilityRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateProfileVisibilityRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const profile = await updateProfileVisibilityUseCase.execute({ actor, studentId, ...parsed.data });
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
  { roles: ["STUDENT"] },
);
