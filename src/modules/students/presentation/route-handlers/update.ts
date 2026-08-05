import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findStudentBatchId, updateStudentUseCase } from "../../infrastructure/container";
import { BatchNotAssignableError, BatchNotFoundError, StudentNotFoundError } from "../../domain/errors";
import { UpdateStudentRequestSchema } from "../validation";

export const updateStudentRouteHandler = withAuth(
  async (req: NextRequest, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = UpdateStudentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid student data", parsed.error.flatten().fieldErrors);
    }

    try {
      const student = await updateStudentUseCase.execute({ actor, studentId, ...parsed.data });
      return NextResponse.json({ data: student });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof BatchNotFoundError) return notFound("Destination batch not found");
      if (err instanceof BatchNotAssignableError) return badRequest(err.message);
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
