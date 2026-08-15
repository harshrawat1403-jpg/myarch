import { NextRequest, NextResponse } from "next/server";
import { badRequest, tooManyRequests } from "@/lib/http-errors";
import { publicMaintenanceReportRateLimiter } from "@/lib/rate-limiters";
import { clientIp } from "@/lib/client-ip";
import { reportPublicMaintenanceIssueUseCase } from "../../infrastructure/container";
import { ReportPublicMaintenanceIssueRequestSchema } from "../validation";

/**
 * Public, unauthenticated — no withAuth wrapper (there is no session to
 * authenticate; see ReportPublicMaintenanceIssueUseCase's own doc comment
 * for why this is a separate use case rather than a weakened branch of the
 * authenticated one). Rate-limited per-IP inline, the exact same pattern
 * submitRegistrationRequestRouteHandler already uses for its own
 * unauthenticated, no-account-required endpoint.
 */
export async function reportPublicMaintenanceIssueRouteHandler(req: NextRequest): Promise<Response> {
  const limit = await publicMaintenanceReportRateLimiter.consume(`maintenance-report:ip:${clientIp(req)}`);
  if (!limit.allowed) {
    return tooManyRequests("Too many reports submitted. Please try again later.", limit.retryAfterMs);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = ReportPublicMaintenanceIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid issue data", parsed.error.flatten().fieldErrors);
  }

  const issue = await reportPublicMaintenanceIssueUseCase.execute({
    name: parsed.data.name,
    email: parsed.data.email,
    category: parsed.data.category,
    location: parsed.data.location,
    description: parsed.data.description,
    priority: parsed.data.priority,
  });

  // Only the reference id — never internal fields (assigneeId, resolutionDetails,
  // publicReporterName/Email echoed back, etc.). A public visitor gets exactly
  // enough to track their own report and nothing about the internal system.
  return NextResponse.json({ data: { id: issue.id } }, { status: 201 });
}
