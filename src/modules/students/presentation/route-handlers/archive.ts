import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { archiveStudentUseCase, findStudentBatchId } from "../../infrastructure/container";
import { StudentAlreadyArchivedError, StudentNotFoundError } from "../../domain/errors";

export const archiveStudentRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const student = await archiveStudentUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: student });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof StudentAlreadyArchivedError) return conflict(err.message);
      throw err;
    }
  },
  {
    roles: ["SECRETARY", "COORDINATOR"],
    getRequiredBatchId: async (_req, routeContext) => {
      const studentId = await extractRouteParam(routeContext, "id");
      return studentId ? findStudentBatchId(studentId) : undefined;
    },
  },
);
