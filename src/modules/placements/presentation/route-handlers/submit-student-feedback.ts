import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { submitStudentFeedbackUseCase } from "../../infrastructure/container";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";
import { SubmitStudentFeedbackRequestSchema } from "../validation";

export const submitStudentFeedbackRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = SubmitStudentFeedbackRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const outcome = await submitStudentFeedbackUseCase.execute({
        actor,
        applicationId,
        studentFeedback: parsed.data.studentFeedback,
      });
      return NextResponse.json({ data: outcome });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InternshipOutcomeNotFoundError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["STUDENT"] },
);
