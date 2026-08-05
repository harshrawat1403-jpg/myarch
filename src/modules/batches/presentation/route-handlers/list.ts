import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { listBatchesUseCase } from "../../infrastructure/container";

export const listBatchesRouteHandler = withAuth(
  async (_req, { actor }) => {
    const batches = await listBatchesUseCase.execute({ actor });
    return NextResponse.json({ data: batches });
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
