import { NextResponse } from "next/server";
import { listRegisterableBatchesUseCase } from "../../infrastructure/container";

/** Public, unauthenticated — deliberately returns only {id, name} for ACTIVE batches (see RegisterableBatchLookup's doc comment), never the authenticated /api/batches endpoint's full shape. */
export async function listOpenBatchesRouteHandler(): Promise<Response> {
  const batches = await listRegisterableBatchesUseCase.execute();
  return NextResponse.json({ data: batches });
}
