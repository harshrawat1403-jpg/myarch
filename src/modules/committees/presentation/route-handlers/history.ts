import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { PrismaAuditRecorder } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCommitteeUseCase } from "../../infrastructure/container";
import { CommitteeNotFoundError } from "../../domain/errors";

const auditRecorder = new PrismaAuditRecorder(prisma);
const HISTORY_LIMIT = 100;

/** "Activity history" (§5) — mirrors maintenance's own getMaintenanceIssueHistoryRouteHandler: a read-only feed calling PrismaAuditRecorder directly, reusing GetCommitteeUseCase purely for its authorization check (canViewCommittee). */
export const getCommitteeHistoryRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const committeeId = await extractRouteParam(routeContext, "id");
  if (!committeeId) return notFound("Committee not found");

  try {
    await getCommitteeUseCase.execute({ actor, committeeId });
    const entries = await auditRecorder.listForEntity("Committee", committeeId, HISTORY_LIMIT);
    return NextResponse.json({ data: entries });
  } catch (err) {
    if (err instanceof CommitteeNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
