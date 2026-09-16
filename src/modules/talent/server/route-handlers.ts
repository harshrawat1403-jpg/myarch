import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/modules/auth";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";
import { deleteFile, readFile, saveFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { canEditOwnTalentProfile, canFeatureTalent } from "@/modules/platform";
import { FeatureTalentSchema, TalentDocumentUploadSchema, TalentProfileInputSchema } from "./validation";
import { getOwnTalentProfile, getPublishedTalentProfile, setTalentFeatured, upsertOwnTalentProfile } from "./repository";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const getOwnTalentProfileRouteHandler = withAuth(async (_req, { actor }) => {
  if (!actor.studentProfileId) return notFound("Talent profile not found");
  const profile = await getOwnTalentProfile(actor.studentProfileId);
  return NextResponse.json({ data: profile });
}, { roles: ["STUDENT"] });

export const saveOwnTalentProfileRouteHandler = withAuth(async (req, { actor }) => {
  if (!actor.studentProfileId || !canEditOwnTalentProfile(actor, actor.studentProfileId)) return forbidden("Not authorized to edit this talent profile");
  const parsed = TalentProfileInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid talent profile data", parsed.error.flatten().fieldErrors);
  const profile = await upsertOwnTalentProfile(actor.studentProfileId, parsed.data);
  return NextResponse.json({ data: profile });
}, { roles: ["STUDENT"] });

export const getPublishedTalentProfileRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const studentProfileId = await extractRouteParam(routeContext, "studentProfileId");
  if (!studentProfileId) return notFound("Talent profile not found");
  if (actor.role === "STUDENT" && actor.studentProfileId === studentProfileId) {
    const own = await getOwnTalentProfile(studentProfileId);
    return own ? NextResponse.json({ data: own }) : notFound("Talent profile not found");
  }
  const profile = await getPublishedTalentProfile(studentProfileId);
  return profile ? NextResponse.json({ data: profile }) : notFound("Talent profile not found");
}, { roles: ["SECRETARY", "COORDINATOR", "STUDENT", "RECRUITER"] });

export const setTalentFeaturedRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  if (!canFeatureTalent(actor)) return forbidden("Not authorized to feature talent profiles");
  const studentProfileId = await extractRouteParam(routeContext, "studentProfileId");
  if (!studentProfileId) return notFound("Talent profile not found");
  const parsed = FeatureTalentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid featured setting", parsed.error.flatten().fieldErrors);
  const profile = await setTalentFeatured(studentProfileId, parsed.data.featured).catch(() => null);
  return profile ? NextResponse.json({ data: profile }) : notFound("Talent profile not found");
}, { roles: ["SECRETARY"] });

export const uploadTalentDocumentRouteHandler = withAuth(async (req, { actor }) => {
  if (!actor.studentProfileId || !canEditOwnTalentProfile(actor, actor.studentProfileId)) return forbidden("Not authorized to manage talent documents");
  const formData = await req.formData().catch(() => null);
  const parsed = TalentDocumentUploadSchema.safeParse({ kind: formData?.get("kind"), visibility: formData?.get("visibility") ?? "PRIVATE" });
  const upload = formData?.get("file");
  if (!parsed.success || !(upload instanceof File) || upload.type !== "application/pdf" || upload.size > MAX_DOCUMENT_BYTES) {
    return badRequest("Upload a PDF document no larger than 5MB");
  }

  const storageKey = `talent-documents/${actor.studentProfileId}/${randomUUID()}.pdf`;
  await saveFile(storageKey, Buffer.from(await upload.arrayBuffer()));
  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.talentProfile.upsert({ where: { studentProfileId: actor.studentProfileId! }, create: { studentProfileId: actor.studentProfileId! }, update: {} });
      const asset = await tx.fileAsset.create({ data: { ownerUserId: actor.userId, storageKey, mimeType: "application/pdf", sizeBytes: upload.size, classification: "PRIVATE" } });
      await tx.talentDocument.upsert({
        where: { talentProfileId_kind: { talentProfileId: profile.id, kind: parsed.data.kind } },
        create: { talentProfileId: profile.id, kind: parsed.data.kind, fileId: asset.id, visibility: parsed.data.visibility },
        update: { fileId: asset.id, visibility: parsed.data.visibility },
      });
    });
  } catch (error) {
    await deleteFile(storageKey).catch(() => undefined);
    throw error;
  }
  return NextResponse.json({ data: { kind: parsed.data.kind, visibility: parsed.data.visibility } }, { status: 201 });
}, { roles: ["STUDENT"] });

export const getOwnTalentDocumentRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const kind = await extractRouteParam(routeContext, "kind");
  if (!actor.studentProfileId || (kind !== "RESUME" && kind !== "PORTFOLIO")) return notFound("Document not found");
  const document = await prisma.talentDocument.findFirst({
    where: { kind, talentProfile: { studentProfileId: actor.studentProfileId } },
    include: { file: true },
  });
  if (!document) return notFound("Document not found");
  const bytes = await readFile(document.file.storageKey).catch(() => null);
  if (!bytes) return notFound("Document not found");
  return new NextResponse(bytes as unknown as BodyInit, { headers: { "Content-Type": document.file.mimeType, "Cache-Control": "private, no-store" } });
}, { roles: ["STUDENT"] });
