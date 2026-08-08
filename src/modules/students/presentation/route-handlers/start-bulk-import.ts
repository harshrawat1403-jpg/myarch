import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { startBulkImportUseCase } from "../../infrastructure/container";
import { BatchNotAssignableError, BatchNotFoundError, EmptyCsvFileError } from "../../domain/errors";

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — a department-scale roster CSV is a few hundred rows at most.

export const startBulkImportRouteHandler = withAuth(
  async (req, { actor }) => {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    const batchId = formData?.get("batchId");

    if (!(file instanceof File) || typeof batchId !== "string" || !batchId) {
      return badRequest("A file and batchId are required");
    }
    if (file.size > MAX_CSV_SIZE_BYTES) {
      return badRequest("CSV file must be 5MB or smaller");
    }

    const fileData = Buffer.from(await file.arrayBuffer());

    try {
      const result = await startBulkImportUseCase.execute({ actor, batchId, fileData });
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      if (err instanceof BatchNotFoundError) return notFound("Batch not found");
      if (err instanceof BatchNotAssignableError) return badRequest(err.message);
      if (err instanceof EmptyCsvFileError) return conflict(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);
