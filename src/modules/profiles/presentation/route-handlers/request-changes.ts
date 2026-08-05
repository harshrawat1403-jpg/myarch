import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { StudentNotFoundError } from "@/modules/students";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findStudentBatchId, requestChangesUseCase } from "../../infrastructure/container";
import {
  DraftNotFoundError,
  InvalidDraftTransitionError,
  MissingReviewCommentError,
} from "../../domain/errors";
import { RequestChangesRequestSchema } from "../validation";

export const requestChangesRouteHandler = withAuth(
  async (req: NextRequest, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = RequestChangesRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("A review comment is required", parsed.error.flatten().fieldErrors);
    }

    try {
      const draft = await requestChangesUseCase.execute({
        actor,
        studentId,
        reviewComment: parsed.data.reviewComment,
      });
      return NextResponse.json({ data: draft });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof DraftNotFoundError) return notFound("No draft exists to review");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof InvalidDraftTransitionError) return badRequest(err.message);
      if (err instanceof MissingReviewCommentError) return badRequest(err.message);
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
