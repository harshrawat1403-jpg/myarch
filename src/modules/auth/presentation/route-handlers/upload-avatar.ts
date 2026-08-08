import { NextResponse } from "next/server";
import { InvalidAvatarFileError } from "../../domain/errors";
import { getUploadAvatarUseCase, withAuth } from "../../infrastructure/container";
import { badRequest } from "@/lib/http-errors";

export const uploadAvatarRouteHandler = withAuth(async (req, { actor }) => {
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return badRequest("A file field is required");
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const result = await getUploadAvatarUseCase().execute({
      actor,
      data,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return NextResponse.json({ data: { fileId: result.fileId, avatarUrl: `/api/files/${result.fileId}` } });
  } catch (err) {
    if (err instanceof InvalidAvatarFileError) return badRequest(err.message);
    throw err;
  }
});
