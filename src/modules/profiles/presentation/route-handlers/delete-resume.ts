import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { deleteFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { DraftLockedForReviewError } from "../../domain/errors";
import { getEditableDraft } from "./profile-file-utils";

export const deleteResumeRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const studentId = await extractRouteParam(routeContext, "id");
  if (!studentId) return notFound("Student not found");
  try {
    const draft = await getEditableDraft(actor, studentId);
    if (!draft) return notFound("Student not found");
    if (!draft.resumeFileId) return NextResponse.json({ data: { deleted: true } });
    await prisma.studentPublicProfileDraft.update({ where: { id: draft.id }, data: { resumeFileId: null } });
    const published = await prisma.studentPublicProfile.findUnique({ where: { studentProfileId: studentId }, select: { resumeFileId: true } });
    if (published?.resumeFileId !== draft.resumeFileId) {
      const asset = await prisma.fileAsset.delete({ where: { id: draft.resumeFileId } }).catch(() => null);
      if (asset) await deleteFile(asset.storageKey).catch(() => undefined);
    }
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof NotAuthorizedError || error instanceof DraftLockedForReviewError) return forbidden(error.message);
    throw error;
  }
}, { roles: ["STUDENT"] });
