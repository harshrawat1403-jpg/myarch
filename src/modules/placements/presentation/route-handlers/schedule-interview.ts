import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { findApplicationBatchId, scheduleInterviewUseCase } from "../../infrastructure/container";
import { ApplicationNotFoundError, InterviewNotSchedulableError } from "../../domain/errors";
import { ScheduleInterviewRequestSchema } from "../validation";

/** V4.0 D3 (§14, §18) — PATCH /api/placements/applications/[id]/interview. */
export const scheduleInterviewRouteHandler = withAuth(
  async (req, { actor }, routeContext) => {
    const applicationId = await extractRouteParam(routeContext, "id");
    if (!applicationId) return notFound("Application not found");

    const body: unknown = await req.json().catch(() => null);
    const parsed = ScheduleInterviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten().fieldErrors);
    }

    try {
      const application = await scheduleInterviewUseCase.execute({
        actor,
        applicationId,
        scheduledAt: parsed.data.scheduledAt,
        mode: parsed.data.mode,
      });
      return NextResponse.json({ data: application });
    } catch (err) {
      if (err instanceof ApplicationNotFoundError) return notFound(err.message);
      if (err instanceof InterviewNotSchedulableError) return conflict(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  {
    roles: ["SECRETARY", "COORDINATOR"],
    getRequiredBatchId: async (_req, routeContext) => {
      const applicationId = await extractRouteParam(routeContext, "id");
      return applicationId ? findApplicationBatchId(applicationId) : undefined;
    },
  },
);
