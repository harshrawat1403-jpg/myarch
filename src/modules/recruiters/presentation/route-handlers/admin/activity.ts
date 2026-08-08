import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { notFound } from "@/lib/http-errors";
import { PrismaAuditRecorder } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getRecruiterAccountUseCase } from "../../../infrastructure/container";
import { RecruiterAccountNotFoundError } from "../../../domain/errors";

const auditRecorder = new PrismaAuditRecorder(prisma);
const ACTIVITY_LIMIT = 20;

/**
 * Mirrors coordinators' own getCoordinatorActivityRouteHandler pattern: a
 * read-only activity feed calls PrismaAuditRecorder directly rather than
 * through a dedicated use case.
 */
export const getRecruiterActivityRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const recruiterId = await extractRouteParam(routeContext, "id");
    if (!recruiterId) return notFound("Recruiter not found");

    try {
      const recruiter = await getRecruiterAccountUseCase.execute({ actor, recruiterId });
      const entries = await auditRecorder.listForAccount(recruiter.userId, ACTIVITY_LIMIT);
      return NextResponse.json({ data: entries });
    } catch (err) {
      if (err instanceof RecruiterAccountNotFoundError) return notFound(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
