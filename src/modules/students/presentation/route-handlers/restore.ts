import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findStudentBatchId, restoreStudentUseCase } from "../../infrastructure/container";
import { StudentAlreadyActiveError, StudentNotFoundError } from "../../domain/errors";

export const restoreStudentRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const student = await restoreStudentUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: student });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof StudentAlreadyActiveError) return conflict(err.message);
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
