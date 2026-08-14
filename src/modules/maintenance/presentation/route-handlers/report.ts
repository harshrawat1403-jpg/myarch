import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { reportMaintenanceIssueUseCase } from "../../infrastructure/container";
import { ReportMaintenanceIssueRequestSchema } from "../validation";

export const reportMaintenanceIssueRouteHandler = withAuth(async (req, { actor }) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = ReportMaintenanceIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid issue data", parsed.error.flatten().fieldErrors);
  }

  try {
    const issue = await reportMaintenanceIssueUseCase.execute({
      actor,
      category: parsed.data.category,
      location: parsed.data.location,
      description: parsed.data.description,
      priority: parsed.data.priority,
    });
    return NextResponse.json({ data: issue }, { status: 201 });
  } catch (err) {
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
