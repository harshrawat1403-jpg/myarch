import { NextResponse } from "next/server";
import { internalServerError } from "@/lib/http-errors";
import { listRegisterableBatchesUseCase } from "../../infrastructure/container";

/** Public, unauthenticated — deliberately returns only {id, name} for ACTIVE batches (see RegisterableBatchLookup's doc comment), never the authenticated /api/batches endpoint's full shape. */
export async function listOpenBatchesRouteHandler(): Promise<Response> {
  try {
    const batches = await listRegisterableBatchesUseCase.execute();
    return NextResponse.json({ data: batches });
  } catch (error) {
    console.error("[registration] unable to load open batches", error);
    return internalServerError("Registration is temporarily unavailable. Please try again shortly.");
  }
}
