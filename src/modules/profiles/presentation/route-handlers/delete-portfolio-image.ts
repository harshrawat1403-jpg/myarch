import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { deleteFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { DraftLockedForReviewError } from "../../domain/errors";
import { getEditableDraft } from "./profile-file-utils";

export const deletePortfolioImageRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const studentId = await extractRouteParam(routeContext, "id");
  const imageId = await extractRouteParam(routeContext, "imageId");
  if (!studentId || !imageId) return notFound("Portfolio image not found");
  try {
    const draft = await getEditableDraft(actor, studentId);
    if (!draft) return notFound("Student not found");
    const image = await prisma.studentPortfolioImage.findFirst({ where: { id: imageId, studentProfileId: studentId, draftId: draft.id }, include: { file: true } });
    if (!image) return notFound("Portfolio image not found");
    if (image.publishedProfileId) await prisma.studentPortfolioImage.update({ where: { id: image.id }, data: { draftId: null } });
    else {
      await prisma.$transaction([prisma.studentPortfolioImage.delete({ where: { id: image.id } }), prisma.fileAsset.delete({ where: { id: image.fileId } })]);
      await deleteFile(image.file.storageKey).catch(() => undefined);
    }
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof NotAuthorizedError || error instanceof DraftLockedForReviewError) return forbidden(error.message);
    throw error;
  }
}, { roles: ["STUDENT"] });
