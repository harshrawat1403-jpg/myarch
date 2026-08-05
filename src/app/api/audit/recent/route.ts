import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder, resolveAuditFilter } from "@/lib/audit";

const auditRecorder = new PrismaAuditRecorder(prisma);

/**
 * "Display audit history where appropriate. Do not implement advanced
 * filtering yet" — Day 7 scope. Secretary sees the most recent 50 entries
 * system-wide; a Coordinator sees only their own actions (see
 * src/lib/audit.ts's listRecent doc comment for why this is narrower than
 * the full "own actions + in-scope" from docs/security/09_User_Roles_and_Permissions.md).
 */
export const GET = withAuth(
  async (_req, { actor }) => {
    const entries = await auditRecorder.listRecent(resolveAuditFilter(actor), 50);
    return NextResponse.json({ data: entries });
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
