import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findStudentBatchId, listConfidentialDocumentsUseCase } from "../../infrastructure/container";
import { StudentNotFoundError } from "../../domain/errors";

export const listConfidentialDocumentsRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    try {
      const documents = await listConfidentialDocumentsUseCase.execute({ actor, studentId });
      return NextResponse.json({ data: documents });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
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
