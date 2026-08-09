import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { listStudentInterestsUseCase } from "../../../infrastructure/container";

/** V4.0 C3 — GET /api/student/interests, the student's own inbox of received interest requests. */
export const listStudentInterestsRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const interests = await listStudentInterestsUseCase.execute(actor);
      return NextResponse.json({ data: interests });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
