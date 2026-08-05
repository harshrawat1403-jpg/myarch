import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { StudentNotFoundError } from "@/modules/students";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { saveDraftUseCase } from "../../infrastructure/container";
import { DraftLockedForReviewError } from "../../domain/errors";
import { SaveDraftRequestSchema } from "../validation";

export const saveDraftRouteHandler = withAuth(
  async (req: NextRequest, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Student not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SaveDraftRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid profile draft data", parsed.error.flatten().fieldErrors);
    }

    try {
      const draft = await saveDraftUseCase.execute({ actor, studentId, content: parsed.data });
      return NextResponse.json({ data: draft });
    } catch (err) {
      if (err instanceof StudentNotFoundError) return notFound("Student not found");
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof DraftLockedForReviewError) return forbidden(err.message);
      throw err;
    }
  },
  // No getRequiredBatchId here: this route is STUDENT-only, and Students
  // never carry a batchScope (that's a Coordinator concept) — the real
  // authorization check is ownership (actor.studentProfileId === the
  // student in the URL), which SaveDraftUseCase already enforces via
  // canEditPublicProfileDraft plus its own student-only re-check.
  { roles: ["STUDENT"] },
);
