import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest } from "@/lib/http-errors";
import { InvalidContentOverrideError } from "../../domain/errors";
import { uploadContentOverrideImageUseCase } from "../../infrastructure/container";

export const uploadContentOverrideImageRouteHandler = withAuth(
  async (req, { actor }) => {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) return badRequest("A file field is required");

    const data = Buffer.from(await file.arrayBuffer());

    try {
      const result = await uploadContentOverrideImageUseCase.execute({ actor, data, mimeType: file.type, sizeBytes: file.size });
      return NextResponse.json({ data: { fileId: result.fileId, url: `/api/files/${result.fileId}` } });
    } catch (err) {
      if (err instanceof InvalidContentOverrideError) return badRequest(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY"] },
);
