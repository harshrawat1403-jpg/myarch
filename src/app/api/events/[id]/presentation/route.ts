import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/file-storage";
import { withAuth } from "@/modules/auth";
import { canManageEvent } from "@/modules/events";
import { extractRouteParam } from "@/lib/route-params";
import { badRequest, forbidden, notFound } from "@/lib/http-errors";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 10 * 1024 * 1024;

async function managedEvent(eventId: string, actor: Parameters<typeof canManageEvent>[0]) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  return event && canManageEvent(actor, event) ? event : null;
}

export const GET = withAuth(async (_request, { actor }, context) => {
  const eventId = await extractRouteParam(context, "id");
  if (!eventId) return notFound("Event not found");
  const event = await managedEvent(eventId, actor);
  if (!event) return forbidden("Not authorized to manage this event");
  const data = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: { gallery: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }], include: { file: { select: { id: true, mimeType: true } } } }, formLinks: { include: { form: { select: { id: true, title: true } } } }, announcementLinks: { include: { announcement: { select: { id: true, title: true } } } } } });
  return NextResponse.json({ data });
});

export const POST = withAuth(async (request, { actor }, context) => {
  const eventId = await extractRouteParam(context, "id");
  if (!eventId) return notFound("Event not found");
  if (!await managedEvent(eventId, actor)) return forbidden("Not authorized to manage this event");
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const body = await request.formData(); const file = body.get("file"); const target = body.get("target");
    if (!(file instanceof File) || (target !== "cover" && target !== "gallery")) return badRequest("An image file and valid target are required");
    if (!imageTypes.has(file.type) || file.size > maxImageBytes) return badRequest("Use a JPEG, PNG, or WebP image up to 10 MB");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const storageKey = `event-media/${eventId}/${randomUUID()}.${extension}`;
    const fileRow = await prisma.fileAsset.create({ data: { ownerUserId: actor.userId, storageKey, mimeType: file.type, sizeBytes: file.size, classification: "PUBLIC" } });
    try { await saveFile(storageKey, Buffer.from(await file.arrayBuffer())); } catch (error) { await prisma.fileAsset.delete({ where: { id: fileRow.id } }); throw error; }
    if (target === "cover") await prisma.event.update({ where: { id: eventId }, data: { coverImageFileId: fileRow.id } });
    else await prisma.eventGalleryItem.create({ data: { eventId, fileId: fileRow.id, uploadedByUserId: actor.userId, caption: typeof body.get("caption") === "string" ? String(body.get("caption")).trim() || null : null, displayOrder: Number(body.get("displayOrder") || 0) } });
    return NextResponse.json({ data: { id: fileRow.id } }, { status: 201 });
  }
  const body = await request.json().catch(() => null) as { type?: string; id?: string; kind?: "REGISTRATION" | "VOLUNTEER" | "OTHER" } | null;
  if (!body?.id || !["form", "announcement"].includes(body.type || "")) return badRequest("A link type and id are required");
  if (body.type === "form") { await prisma.eventForm.create({ data: { eventId, formId: body.id, kind: body.kind || "OTHER" } }); }
  else { await prisma.eventAnnouncement.create({ data: { eventId, announcementId: body.id } }); }
  return NextResponse.json({ data: { linked: true } }, { status: 201 });
});

export const PATCH = withAuth(async (request, { actor }, context) => {
  const eventId = await extractRouteParam(context, "id");
  if (!eventId) return notFound("Event not found");
  if (!await managedEvent(eventId, actor)) return forbidden("Not authorized to manage this event");
  const body = await request.json().catch(() => null) as { galleryId?: string; caption?: string | null; displayOrder?: number } | null;
  if (!body?.galleryId) return badRequest("A gallery item is required");
  const gallery = await prisma.eventGalleryItem.findFirst({ where: { id: body.galleryId, eventId } });
  if (!gallery) return notFound("Gallery item not found");
  await prisma.eventGalleryItem.update({ where: { id: gallery.id }, data: { caption: body.caption === undefined ? undefined : body.caption?.trim() || null, displayOrder: Number.isInteger(body.displayOrder) ? body.displayOrder : undefined } });
  return NextResponse.json({ data: { updated: true } });
});

export const DELETE = withAuth(async (request, { actor }, context) => {
  const eventId = await extractRouteParam(context, "id");
  if (!eventId) return notFound("Event not found");
  if (!await managedEvent(eventId, actor)) return forbidden("Not authorized to manage this event");
  const galleryId = new URL(request.url).searchParams.get("galleryId");
  if (!galleryId) return badRequest("A gallery item is required");
  const gallery = await prisma.eventGalleryItem.findFirst({ where: { id: galleryId, eventId } });
  if (!gallery) return notFound("Gallery item not found");
  await prisma.eventGalleryItem.delete({ where: { id: gallery.id } });
  return new Response(null, { status: 204 });
});
