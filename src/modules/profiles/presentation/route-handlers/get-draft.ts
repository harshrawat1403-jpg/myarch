import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { StudentNotFoundError } from "@/modules/students";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findStudentBatchId, getDraftUseCase } from "../../infrastructure/container";
import { DraftNotFoundError } from "../../domain/errors";

export const getDraftRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const draft = await getDraftUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: draft });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof DraftNotFoundError) return notFound("No draft exists for this student");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    // Not RECRUITER, ever — "Recruiters must never see drafts."
    roles: ["SECRETARY", "COORDINATOR", "STUDENT"],
    getRequiredBatchId: async (_req, routeContext) => {
      const studentId = await extractRouteParam(routeContext, "id");
      return studentId ? findStudentBatchId(studentId) : undefined;
    },
  },
);
