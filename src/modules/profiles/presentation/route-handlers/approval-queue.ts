import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { listApprovalQueueUseCase } from "../../infrastructure/container";

export const approvalQueueRouteHandler = withAuth(
  async (_req, { actor }) => {
    const queue = await listApprovalQueueUseCase.execute({ actor });
    return NextResponse.json({ data: queue, meta: { count: queue.length } });
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
