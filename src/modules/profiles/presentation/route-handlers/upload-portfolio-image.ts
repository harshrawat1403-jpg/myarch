import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { deleteFile, saveFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { DraftLockedForReviewError } from "../../domain/errors";
import { generatedStorageKey, getEditableDraft, optionalText, PORTFOLIO_IMAGE_LIMIT, PORTFOLIO_IMAGE_MAX_BYTES, PROFILE_IMAGE_MIME_TYPES } from "./profile-file-utils";

export const uploadPortfolioImageRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const studentId = await extractRouteParam(routeContext, "id");
  if (!studentId) return notFound("Student not found");
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || !PROFILE_IMAGE_MIME_TYPES[file.type] || file.size > PORTFOLIO_IMAGE_MAX_BYTES) return badRequest("Upload a JPEG, PNG, or WebP image no larger than 5MB");
  try {
    const draft = await getEditableDraft(actor, studentId);
    if (!draft) return notFound("Student not found");
    const count = await prisma.studentPortfolioImage.count({ where: { draftId: draft.id } });
    if (count >= PORTFOLIO_IMAGE_LIMIT) return badRequest("A profile can have at most 10 portfolio images");
    const title = optionalText(formData?.get("title") ?? null, 200);
    const caption = optionalText(formData?.get("caption") ?? null, 1000);
    const extension = PROFILE_IMAGE_MIME_TYPES[file.type]!;
    const storageKey = generatedStorageKey("portfolio-images", studentId, extension);
    await saveFile(storageKey, Buffer.from(await file.arrayBuffer()));
    try {
      const image = await prisma.$transaction(async (tx) => {
        const asset = await tx.fileAsset.create({ data: { ownerUserId: actor.userId, storageKey, mimeType: file.type, sizeBytes: file.size, classification: "PRIVATE" } });
        return tx.studentPortfolioImage.create({ data: { studentProfileId: studentId, draftId: draft.id, fileId: asset.id, title, caption, sortOrder: count } });
      });
      return NextResponse.json({ data: { id: image.id, fileId: image.fileId, title: image.title, caption: image.caption, sortOrder: image.sortOrder } }, { status: 201 });
    } catch (error) { await deleteFile(storageKey).catch(() => undefined); throw error; }
  } catch (error) {
    if (error instanceof NotAuthorizedError || error instanceof DraftLockedForReviewError) return forbidden(error.message);
    if (error instanceof Error && error.message === "Text is too long") return badRequest(error.message);
    throw error;
  }
}, { roles: ["STUDENT"] });
