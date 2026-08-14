import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { PrismaAuditRecorder } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getRequestUseCase } from "../../infrastructure/container";
import { RequestNotFoundError } from "../../domain/errors";

const auditRecorder = new PrismaAuditRecorder(prisma);
const HISTORY_LIMIT = 100;

/** Mirrors getMaintenanceIssueHistoryRouteHandler exactly. */
export const getRequestHistoryRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const requestId = await extractRouteParam(routeContext, "id");
  if (!requestId) return notFound("Request not found");

  try {
    await getRequestUseCase.execute({ actor, requestId });
    const entries = await auditRecorder.listForEntity("Request", requestId, HISTORY_LIMIT);
    return NextResponse.json({ data: entries });
  } catch (err) {
    if (err instanceof RequestNotFoundError) return notFound(err.message);
    if (err instanceof NotAuthorizedError) return forbidden(err.message);
    throw err;
  }
});
