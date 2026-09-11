import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { deleteFile, saveFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { DraftLockedForReviewError } from "../../domain/errors";
import { generatedStorageKey, getEditableDraft, RESUME_MAX_BYTES } from "./profile-file-utils";

export const uploadResumeRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const studentId = await extractRouteParam(routeContext, "id");
  if (!studentId) return notFound("Student not found");
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size > RESUME_MAX_BYTES) return badRequest("Upload a PDF resume no larger than 3MB");
  try {
    const draft = await getEditableDraft(actor, studentId);
    if (!draft) return notFound("Student not found");
    const storageKey = generatedStorageKey("resumes", studentId, "pdf");
    await saveFile(storageKey, Buffer.from(await file.arrayBuffer()));
    try {
      const created = await prisma.$transaction(async (tx) => {
        const asset = await tx.fileAsset.create({ data: { ownerUserId: actor.userId, storageKey, mimeType: "application/pdf", sizeBytes: file.size, classification: "PRIVATE" } });
        await tx.studentPublicProfileDraft.update({ where: { id: draft.id }, data: { resumeFileId: asset.id } });
        return asset;
      });
      if (draft.resumeFileId) {
        const published = await prisma.studentPublicProfile.findUnique({ where: { studentProfileId: studentId }, select: { resumeFileId: true } });
        if (published?.resumeFileId !== draft.resumeFileId) {
          const previous = await prisma.fileAsset.delete({ where: { id: draft.resumeFileId } }).catch(() => null);
          if (previous) await deleteFile(previous.storageKey).catch(() => undefined);
        }
      }
      return NextResponse.json({ data: { fileId: created.id } }, { status: 201 });
    } catch (error) { await deleteFile(storageKey).catch(() => undefined); throw error; }
  } catch (error) {
    if (error instanceof NotAuthorizedError || error instanceof DraftLockedForReviewError) return forbidden(error.message);
    throw error;
  }
}, { roles: ["STUDENT"] });
