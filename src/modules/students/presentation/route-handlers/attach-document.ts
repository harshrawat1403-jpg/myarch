import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { attachConfidentialDocumentUseCase, findStudentBatchId } from "../../infrastructure/container";
import { StudentNotFoundError } from "../../domain/errors";
import { AttachConfidentialDocumentRequestSchema } from "../validation";

export const attachConfidentialDocumentRouteHandler = withAuth(
  async (req: NextRequest, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = AttachConfidentialDocumentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid document reference", parsed.error.flatten().fieldErrors);
    }

    try {
      const reference = await attachConfidentialDocumentUseCase.execute({
        actor,
        studentId,
        ...parsed.data,
      });
      return NextResponse.json({ data: reference }, { status: 201 });
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
