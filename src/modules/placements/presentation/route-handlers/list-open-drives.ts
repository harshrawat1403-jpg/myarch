import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { listOpenDrivesForStudentUseCase } from "../../infrastructure/container";

/** V4.0 D1 — GET /api/student/drives, the career hub's open-drives list (§7 step 8). */
export const listOpenDrivesForStudentRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const drives = await listOpenDrivesForStudentUseCase.execute(actor);
      return NextResponse.json({ data: drives, meta: { count: drives.length } });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
