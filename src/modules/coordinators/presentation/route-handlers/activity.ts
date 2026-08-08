import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { PrismaAuditRecorder } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCoordinatorUseCase } from "../../infrastructure/container";
import { CoordinatorNotFoundError } from "../../domain/errors";

const auditRecorder = new PrismaAuditRecorder(prisma);
const ACTIVITY_LIMIT = 20;

/**
 * Mirrors src/app/api/audit/recent/route.ts's own pattern: a read-only
 * activity feed calls PrismaAuditRecorder directly rather than through a
 * dedicated use case — this codebase's established precedent for
 * query-only audit reads.
 */
export const getCoordinatorActivityRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const coordinatorId = await extractRouteParam(routeContext, "id");
    if (!coordinatorId) return notFound("Coordinator not found");

    try {
      const coordinator = await getCoordinatorUseCase.execute({ actor, coordinatorId });
      const entries = await auditRecorder.listForAccount(coordinator.userId, ACTIVITY_LIMIT);
      return NextResponse.json({ data: entries });
    } catch (err) {
      if (err instanceof CoordinatorNotFoundError) return notFound(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
