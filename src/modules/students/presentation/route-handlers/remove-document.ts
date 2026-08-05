import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findStudentBatchId, removeConfidentialDocumentUseCase } from "../../infrastructure/container";
import { ConfidentialDocumentNotFoundError, StudentNotFoundError } from "../../domain/errors";

export const removeConfidentialDocumentRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    const fileId = await extractRouteParam(routeContext, "fileId");
    if (!studentId || !fileId) return notFound("Not found");

    try {
      await removeConfidentialDocumentUseCase.execute({ actor, studentId, fileId });
      return NextResponse.json({ data: { success: true } });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof ConfidentialDocumentNotFoundError) return notFound("Document reference not found");
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
