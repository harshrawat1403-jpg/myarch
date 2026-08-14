import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { PrismaAuditRecorder } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getMaintenanceIssueUseCase } from "../../infrastructure/container";
import { MaintenanceIssueNotFoundError } from "../../domain/errors";

const auditRecorder = new PrismaAuditRecorder(prisma);
const HISTORY_LIMIT = 100;

/** §3.4 — "timeline." Mirrors recruiters'/coordinators' own getXActivityRouteHandler pattern: a read-only history feed calls PrismaAuditRecorder directly rather than through a dedicated use case. Reuses GetMaintenanceIssueUseCase purely for its authorization check (canViewMaintenanceIssue). */
export const getMaintenanceIssueHistoryRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const issueId = await extractRouteParam(routeContext, "id");
  if (!issueId) return notFound("Maintenance issue not found");

  try {
    await getMaintenanceIssueUseCase.execute({ actor, issueId });
    const entries = await auditRecorder.listForEntity("MaintenanceIssue", issueId, HISTORY_LIMIT);
    return NextResponse.json({ data: entries });
  } catch (err) {
    if (err instanceof MaintenanceIssueNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
