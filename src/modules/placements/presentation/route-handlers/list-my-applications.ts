import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { listMyApplicationsUseCase } from "../../infrastructure/container";

/** V4.0 D1 — GET /api/student/applications (built out further in D2). */
export const listMyApplicationsRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const applications = await listMyApplicationsUseCase.execute(actor);
      return NextResponse.json({ data: applications, meta: { count: applications.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
